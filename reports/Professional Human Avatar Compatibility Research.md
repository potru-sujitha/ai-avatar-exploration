# Professional Human Avatar Compatibility Research

**Scope:** `talking-avatar` repo. Research and feasibility only — no source
code modified, no dependencies installed, no large models downloaded, no
existing files changed. The existing TalkingHead clone at
`poc/talkinghead-poc/TalkingHead` (MIT, confirmed by reading `LICENSE`
directly) was used as the source of truth throughout — all claims below
distinguish **VERIFIED** (read in source or produced directly in this
session), **PARTIAL** (confirmed for part of the requirement, gap
remains), **NOT SUPPORTED** (confirmed absent), and **NOT VERIFIED**
(could not be confirmed from source, vendor docs, or hands-on testing —
third-party/marketing claims only).

---

## 1. Existing TalkingHead architecture analysis

All **VERIFIED** by direct source inspection and/or hands-on testing
earlier in this same research session (`modules/talkinghead.mjs`):

- **Avatar loading**: `showAvatar({url, body, avatarMood, baseline, retarget, modelDynamicBones})` loads any GLB via Three.js `GLTFLoader`. The real scene root is `this.armature` (found via `gltf.scene.getObjectByName(this.opt.modelRoot) || gltf.scene` — NOT `this.avatar`, which is the options object). **Only `url` is mandatory**; everything else is optional.
- **Skeleton**: Mixamo-compatible bone names are required (confirmed by the existence of a dedicated `blender/rename-mixamo-bones.py` conversion script — non-Mixamo rigs must be renamed).
- **Viseme blendshapes**: exactly the **15 Oculus visemes** (`viseme_sil, viseme_PP, viseme_FF, viseme_TH, viseme_DD, viseme_kk, viseme_CH, viseme_SS, viseme_nn, viseme_RR, viseme_aa, viseme_E, viseme_I, viseme_O, viseme_U`), discovered at load time by scanning the mesh's `morphTargetDictionary` for `viseme_*` keys.
- **ARKit**: **YES, fully supported** — confirmed empirically by dumping `Object.keys(head.mtAvatar)` on a loaded avatar: 81 total morph-target keys, Oculus visemes plus a full ARKit-named set (`browDownLeft/Right`, `mouthSmileLeft/Right`, `mouthFrownLeft/Right`, `eyeWideLeft/Right`, `eyeSquintLeft/Right`, `jawForward`, `cheekPuff`, `noseSneerLeft/Right`, etc.). Neither system is mandatory — the mesh only needs to expose whichever morph targets it actually has.
- **Eye blinking**: `eyeBlinkLeft`/`eyeBlinkRight` morph targets, driven autonomously by an internal idle-animation system. **Empirically confirmed**: sampled over 8 idle seconds, genuine autonomous full-closure blinks observed (value reaching 1.0), with no explicit trigger.
- **Eye gaze**: `eyeLookOutLeft/InLeft/OutRight/InRight`, `eyesLookUp/Down`, controlled via `lookAt(x, y, t)` and `makeEyeContact(t)`. **Empirically confirmed**: `lookAt()` toward a far-left screen target drove `eyeLookOutLeft` to a real 0.53, correctly paired with `eyeLookInRight`.
- **Head movement**: `headRotateX/Y/Z` and `bodyRotateX/Y/Z` pose-delta properties, applied to `Head`/`Spine*`/`Hips` bone quaternions.
- **Facial expressions / mood**: `setMood(name)` across `neutral/happy/sad/angry/fear` etc. — each mood defines its own `baseline` (target blendshape values) and `anims` (idle templates). **Empirically confirmed**: switching through happy/sad/angry produced distinct, correct activations matching their documented baselines (e.g. `sad` → `mouthFrownLeft` converging toward 0.8; `angry` → `browDownLeft` toward 0.6 + `mouthFrownLeft` toward 0.7).
- **Custom GLB loading — the key enabler for this whole task**: **YES, confirmed, no animation-engine code change required.** The GLB only needs matching bone names (Mixamo-compatible) and morph target names (Oculus visemes at minimum; ARKit optional for richer expression). TalkingHead's own author has already anticipated exactly this need — the repo ships ready-made conversion scripts for five different avatar sources (MPFB, AvatarSDK, VRoid, CC4, and even Microsoft Rocketbox — see §3/§5).

---

## 2. Current avatar limitations

Why the bundled example avatars (e.g. `brunette.glb`) read as stylized/
cartoon-ish rather than professional:

1. **Rendering defect, already diagnosed and fixed in this same repo's
   other report** (`reports/GitHub Talking Avatar Alternatives Research.md`
   §10b, **VERIFIED**): `this.renderer.shadowMap.enabled = false` is
   hardcoded at init, and the default lighting is a very strong, flat
   ambient fill (`lightAmbientIntensity: 2`) with the depth-defining
   spotlight off by default (`lightSpotIntensity: 0`). No shadows plus
   flat fill light removes all the facial shading (nose bridge, cheekbone,
   chin) that normally reads as "real 3D," independent of mesh quality.
   A tested three-point lighting + manual shadow-casting fix is already
   documented there with before/after screenshots.
2. **Source/style of the specific bundled avatar**: `brunette.glb` is a
   Ready Player Me avatar (**VERIFIED**, from TalkingHead's own README) —
   Ready Player Me's house style trends toward a smoothed, slightly
   stylized "game avatar" look rather than photoreal skin/hair, which is
   a property of that *source*, not of TalkingHead's rendering pipeline.
3. **Clothing**: the bundled avatars' outfits are generic/casual, not
   business attire — this is a per-avatar asset choice, not a technical
   limitation of the engine.

None of this is a TalkingHead engine limitation — all three issues are
properties of *which avatar* is loaded and *how it's lit*, both of which
are the exact things this task is investigating how to change.

---

## 3. Candidate avatar technology research

### A. MPFB / MakeHuman + Blender

- **Maturity of TalkingHead integration — VERIFIED, and the most complete
  of any candidate**: the repo ships a full first-party pipeline —
  `talkinghead-addon.py` (Blender add-on), `talkinghead.mpfbskel` (custom
  rig), `talkinghead.mhw` (custom bone weights), `talkinghead-assets.zip`
  and `talkinghead-targets.zip` (pose library + shape-key targets), plus
  a step-by-step guide (`blender/MPFB/MPFB.md`). No other candidate gets
  this level of packaged support — AvatarSDK and VRoid only get standalone
  conversion scripts, not a full add-on + custom rig + asset library.
- **Workflow (VERIFIED from `MPFB.md`)**: install Blender + MPFB extension
  → download MakeHuman system assets plus the **"Visemes 02" (Meta/Oculus
  style) and "Faceunits 01" (ARKit style)** functional asset packs → install
  TalkingHead's custom rig/weights/add-on → build a human in MPFB
  (gender/age/height/body sliders) → apply the custom TalkingHead rig →
  apply body-part assets (skin, eyes, eyebrows, eyelashes, teeth, tongue,
  hair) and an outfit → export via "Export copy" with "Load meta-style
  visemes" + "Load arkit-style visemes" + "Interpolate visemes and
  faceunits" checked → fix material alpha modes for glTF → export GLB.
  This is a real, documented, repeatable pipeline — not a guess.
- **Realism ceiling — PARTIAL, researched via web search, not just
  marketing claims**: community feedback (Blender Extensions reviews,
  Blender Artists forum, Garden Railway forum) consistently says MPFB/
  MakeHuman produces a strong, flexible **base mesh** with decent face
  shape, but **clothing is described as "dire... very little detail and
  rounded off edges," and stock textures/skins are described as "the
  weakest part"** — a paid job listing for a realistic hero character on
  an MPFB base explicitly asks for a full custom PBR skin set, implying
  the stock skin is not believable out of the box. **Conclusion: a
  genuinely professional, photoreal look is achievable, but requires real
  manual texture/clothing work beyond the default asset packs — it is not
  a one-click realistic result.** ([Blender Extensions reviews](https://extensions.blender.org/add-ons/mpfb/reviews/), [Garden Railway forum](https://gardenrails.org/forum/viewtopic.php?t=15111), [Blender Artists paid-work listing](https://blenderartists.org/t/paid-realistic-hero-character-3-variants-makehuman-mpfb-base-for-a-web-anatomy-atlas-1-000/1649858))
- **Business attire**: **NOT VERIFIED as a ready preset** — MPFB's own
  default clothing assets are reported as low-detail; a formal business
  outfit would most plausibly need a custom/purchased clothing asset
  fitted in Blender, not a stock MakeHuman wardrobe item.
- **Licensing — VERIFIED from TalkingHead's own README**: "MPFB... uses
  3D assets from the MakeHuman ecosystem (licensed **CC0/CC-BY**)." The
  exported `mpfb.glb` example avatar is explicitly **CC0**. This is the
  only candidate with a fully open, unambiguous, no-restriction license
  at every layer (generator software, base body, and the specific
  TalkingHead-provided rig/weights, which are part of the MIT-licensed
  TalkingHead repo itself).

### B. MetaPerson Creator / AvatarSDK

- **TalkingHead compatibility — PARTIAL, VERIFIED from source**: two
  dedicated Blender scripts exist — `build-avatarsdk-eyes.py` and
  `rename-avatarsdk-shapekeys.py`. Reading `build-avatarsdk-eyes.py`
  directly confirms AvatarSDK's raw export has **no eye-rotation shape
  keys at all** — the script procedurally rotates `LeftEye`/`RightEye`
  bones through fixed angles (Up −20°, Down 30°, In/Out 25°) and bakes
  the result into new shape keys from scratch. `rename-avatarsdk-
  shapekeys.py` remaps AvatarSDK's own viseme names (`sil, PP, FF, TH,
  DD, kk, CH, SS, nn, RR, aa, E, ih, oh, ou`) directly to TalkingHead's
  `viseme_*` names (1:1 mapping, confirmed in source) and renames the
  root object to `Armature`. **So: visemes need only a rename (cheap);
  eye gaze needs real reconstruction work (non-trivial).**
- **Realism and business attire — PARTIAL, web-researched**: AvatarSDK's
  own 2021 announcement states full-body avatars ship with a choice of
  outfit styles explicitly including **"business, business casual, and
  casual"** — this is the one candidate with an explicit, named formal/
  business-attire option confirmed from the vendor directly (not
  independently verified by rendering one, so still only a vendor claim,
  not hands-on-tested in this session). A 2023 post also describes an AI
  text-prompt clothing-texture generator. Photo-based realistic avatar
  generation is AvatarSDK/MetaPerson's core product. ([AvatarSDK 2021 post](https://avatarsdk.com/blog/2021/04/08/avatar-sdk-turns-people-into-avatars/), [AvatarSDK 2023 clothing post](https://avatarsdk.com/blog/2023/04/20/avatar-sdk-clothes-generation-with-ai/))
- **Commercial licensing and pricing — PARTIAL, web-researched, figures
  not independently cross-confirmed on the vendor's own current pricing
  page**: first avatar free; **commercial use requires a paid plan**.
  Third-party listings (not the vendor's own current page) show a "Plus"
  tier around **$300–400/month (≈6,000 avatars/month)** and a "Pro" tier
  around **$600–800/month (≈25,000 avatars/month)**, with API access
  gated to Pro (for companies under $2M revenue/funding) or Enterprise
  (custom-quoted) otherwise. **Treat exact figures as NOT VERIFIED** —
  confirm directly at avatarsdk.com before budgeting. ([SaaSWorthy](https://www.saasworthy.com/product/metaperson-creator-software), [xpay.sh](https://www.xpay.sh/saas-pricing/metaperson-creator-software/))

### C. Avaturn

- **TalkingHead compatibility — VERIFIED as the simplest of all three,
  and this is a real finding, not a repeated README claim**: there is
  **no dedicated Blender folder or conversion script for Avaturn
  anywhere in the TalkingHead repo** (confirmed by a fresh file-listing
  search — only `avatars/avaturn.glb` and a promo image exist). Instead,
  `siteconfig.js` shows Avaturn needs only a small **`retarget`** config
  block — pure bone-position/rotation offsets (`Hips: {y: 0.03}`,
  `Spine/Spine1/Spine2: {y, z}`, `Neck: {z, y}`, `Head: {z}`) applied at
  load time in JavaScript, with **zero Blender work**. This directly
  substantiates the README's claim that "Avaturn Type-2 (T2) avatars are
  fully TalkingHead-compatible" — the absence of any conversion script is
  itself the evidence, not an assumption.
- **Realism and business attire — PARTIAL, web-researched**: Avaturn is
  positioned as a photo-based realistic 3D avatar generator; review sites
  describe output as "realistic and recognizable" (editorial opinion, not
  a benchmark). Its own developer docs describe customizable body shape,
  clothing, accessories, hairstyles, shoes, and glasses, plus a custom
  garment-asset pipeline for developers. **No source found confirming a
  specific formal/business-suit preset** — this would need direct
  verification in Avaturn's own editor/asset library, which was not done
  in this research pass (**NOT VERIFIED**).
- **Commercial licensing — PARTIAL, web-researched, sources conflict**:
  the free tier is non-commercial; commercial use on the core
  avaturn.me platform "requires notifying the company, and some
  additional terms apply" (TalkingHead's own README, **VERIFIED**).
  Third-party pricing listings disagree sharply — figures seen range from
  **$19/month to $800/month** for a "Pro" tier, which is too wide a
  spread to be useful (**NOT VERIFIED** — confirm directly with Avaturn).
  Separately, Avaturn also released an **open-weights AI model (AVTR-1)**
  in 2026 under a community license free for commercial use **under
  $10M annual revenue**, which is a different product from the
  avaturn.me avatar-creation platform and not the GLB-export path this
  task is about — noted for completeness, not relevant to this
  integration. ([natlawreview AVTR-1 release](https://natlawreview.com/press-releases/avaturn-releases-avtr-1-first-open-weights-ai-avatar-duplex-model))

### Other candidates (briefly, per the task's "other relevant alternatives" clause)

- **VRoid Studio** — TalkingHead ships a full conversion path
  (`VROID.md`, `build-vroid-eyes.py`, `build-vroid-shapekeys.py`,
  `rename-vroid-bones.py`), comparably complete to MPFB's. **Rejected on
  appearance alone**: VRoid is explicitly an anime-style character
  creator (confirmed in TalkingHead's own README: "a free tool for
  creating anime-style 3D characters") — fundamentally incompatible with
  this task's "not cartoon, anime or game-character style" requirement,
  regardless of its license ("not CC0, but very permissive") or technical
  compatibility.
- **Character Creator / Reallusion CC4** — TalkingHead ships
  `rename-cc4-shapekeys.py`, confirming the author anticipated this
  candidate too. CC4 is a well-known commercial, paid, photoreal
  human-character tool. **Not researched further this pass** (outside
  the three named candidates and a one-line mention is what the task
  asked for) — flag as a worthwhile follow-up if MPFB/AvatarSDK/Avaturn
  all prove insufficient, since CC4's realism ceiling is generally
  regarded as the highest of any tool mentioned here, at commercial cost.
- **Microsoft Rocketbox (note, not one of the three requested candidates,
  but directly relevant to this repo)**: TalkingHead ships
  `rename-rocketbox-shapekeys.py` with full setup notes (download the
  Rocketbox "facial" variant → strip rig in Blender → auto-rig via
  Mixamo → re-import, rename bones/shape keys, add `LeftEye`/`RightEye`
  bones → fine-tune → export GLB). **This is directly relevant to this
  project**, since Rocketbox is the format this repo's own *existing*
  production avatars (`src/renderer.ts`, `TalkingAvatar.ts`) already use
  — meaning the existing Rocketbox-based avatars could themselves be
  converted into TalkingHead-compatible GLBs via a documented path,
  independent of whether MPFB/AvatarSDK/Avaturn are pursued. Mentioned
  here as a finding; not the focus of this report's comparison.

---

## 4. Compatibility comparison table

| Requirement | MPFB | MetaPerson/AvatarSDK | Avaturn |
|---|---|---|---|
| Realistic human appearance | **PARTIAL** — strong base mesh/face shape, but stock textures/clothing are community-reported as weak; needs real manual texture work for a believable professional look | **PARTIAL** — photo-based generation aims for realism; actual output quality not independently benchmarked in this pass (vendor claims only) | **PARTIAL** — photo-based generation, reviewed as "realistic and recognizable" by third parties, not independently benchmarked |
| Professional interviewer appearance | **NOT VERIFIED** — no confirmed formal-business clothing preset; would need custom asset | **PARTIAL** — vendor explicitly offers "business, business casual, casual" outfit styles (vendor claim, not hands-on verified) | **NOT VERIFIED** — no confirmed business-attire preset found |
| GLB export | **VERIFIED** — documented export pipeline in `MPFB.md` | **VERIFIED** — AvatarSDK exports GLB (implied by existence of GLB-targeted conversion scripts) | **VERIFIED** — `avatars/avaturn.glb` example exists and loads |
| Oculus 15 visemes | **VERIFIED** — dedicated "Visemes 02 (Meta/Oculus style)" asset pack + export option | **VERIFIED** — `rename-avatarsdk-shapekeys.py` 1:1-maps AvatarSDK's own viseme names to `viseme_*` | **VERIFIED** — bundled `avaturn.glb` loads directly with no conversion, per TalkingHead's own working example |
| ARKit 52 blendshapes | **VERIFIED** — dedicated "Faceunits 01 (ARKit style)" asset pack + export option | **NOT VERIFIED** — no ARKit-specific script found; only viseme renaming confirmed | **NOT VERIFIED** — not confirmed either way from available scripts/docs |
| Eye blinking | **VERIFIED** — standard shape key export, same mechanism as any TalkingHead avatar | **PARTIAL** — blink shape keys not separately confirmed; only gaze construction script found | **VERIFIED** — works via the bundled example, confirmed compatible out of the box |
| Eye gaze movement | **VERIFIED** — supported via standard export | **NOT SUPPORTED out of the box** — `build-avatarsdk-eyes.py` confirms AvatarSDK's raw export has **no eye-rotation shape keys at all**; they must be procedurally built from scratch | **VERIFIED** — works via the bundled example |
| Head movement | **VERIFIED** — Mixamo-compatible custom rig provided by TalkingHead specifically for MPFB | **PARTIAL** — depends on bone naming after rig conversion; no dedicated bone-rename script found for AvatarSDK (only shape-key rename) | **VERIFIED** — works via the bundled example, only a small position/rotation `retarget` offset needed |
| TalkingHead compatibility | **VERIFIED, most mature** — full first-party add-on + custom rig + weights + pose library | **PARTIAL** — two targeted scripts exist (eyes, shape-key renaming) but gaze requires real reconstruction work | **VERIFIED, simplest** — zero Blender conversion; one small JS `retarget` config |
| Browser/Three.js support | **VERIFIED** — standard GLB, same runtime path as any other avatar | **VERIFIED** — standard GLB | **VERIFIED** — standard GLB |
| Commercial usage rights | **VERIFIED — fully open**: MakeHuman ecosystem assets are CC0/CC-BY (TalkingHead's own README); the `mpfb.glb` example is explicitly CC0 | **VERIFIED restriction, NOT VERIFIED exact price**: commercial use requires a paid plan (Plus/Pro/Enterprise); specific current prices not independently confirmed on vendor's own page | **VERIFIED restriction, NOT VERIFIED exact price**: non-commercial by default; commercial requires notifying Avaturn, terms not published; third-party price figures conflict too widely to trust |
| Additional conversion required | **Significant one-time Blender setup, then repeatable**: install MPFB + asset packs + TalkingHead's custom rig/add-on, build character, export with correct flags | **Moderate-to-significant**: visemes are a cheap rename; eye gaze needs real reconstruction (`build-avatarsdk-eyes.py`); no confirmed ARKit or bone-rename path | **Minimal to none**: a JS `retarget` config only, no Blender step at all |

---

## 5. Technical integration architecture

**Common principle (VERIFIED, §1)**: TalkingHead's animation engine never
needs to change. Only the GLB and, for some candidates, a per-avatar
config object (`url`, `body`, `avatarMood`, `baseline`, `retarget`) in the
loader call change. This directly answers the task's core architectural
question: yes, the avatar can be swapped without touching the engine.

**A. MPFB** (most setup work, most complete end state):
1. Install Blender + MPFB extension; download MakeHuman system assets and specifically the "Visemes 02" and "Faceunits 01" functional asset packs.
2. Install TalkingHead's `talkinghead-addon.py`, load `talkinghead.mpfbskel` (rig) and `talkinghead.mhw` (weights), save as a library rig named "talkinghead".
3. Build a new human: set gender/age/height/body parameters, apply the "talkinghead" custom rig, apply body-part assets (skin/eyes/eyebrows/eyelashes/teeth/tongue/hair) and an outfit — a formal outfit would need to be sourced/created separately given the community-reported weakness of stock MPFB clothing (§3).
4. Export via "Export copy" with "Load meta-style visemes," "Load arkit-style visemes," and "Interpolate visemes and faceunits" all checked; fix glTF alpha modes per material type; export GLB.
5. Point `showAvatar({url: './avatars/professional-female.glb', body: 'F', ...})` at the new file. No other code changes.

**B. AvatarSDK/MetaPerson**:
1. Generate/export an avatar via AvatarSDK's own tooling (photo-based or parametric, including a "business" outfit style if available on the chosen plan).
2. Run `rename-avatarsdk-shapekeys.py` in Blender to remap AvatarSDK's native viseme names to `viseme_*` and rename the root to `Armature`.
3. Run `build-avatarsdk-eyes.py` to procedurally construct the missing eye-rotation shape keys (confirm the up/down/in/out angle defaults look correct for the specific model; the script's defaults are tuned numbers, not guaranteed universal).
4. No confirmed path exists yet for ARKit blendshapes or bone-name verification against Mixamo — this would need to be checked/fixed by hand before trusting head-movement/pose compatibility.
5. Export GLB, point `showAvatar()` at it.

**C. Avaturn** (least setup work):
1. Generate an avatar in Avaturn as a **Type-2 (T2)** avatar specifically (per TalkingHead's own README — this detail matters, other Avaturn export types are not confirmed compatible).
2. Export the GLB directly — no Blender step.
3. Load it with `showAvatar({url: '...', body: 'F', retarget: { Hips: {y: 0.03}, Spine: {y: 0.02}, Spine1: {y: 0.02, z: 0.01}, Spine2: {y: 0.02, z: 0.01}, Neck: {z: 0.02, y: 0.01}, Head: {z: 0.02} }})` — the exact offsets already published in `siteconfig.js`, confirmed working against the bundled `avaturn.glb` example.
4. Apply the lighting fix from §2/`reports/GitHub Talking Avatar Alternatives Research.md` §10b regardless of which avatar is used — it is independent of avatar source.

---

## 6. Licensing analysis (kept separate by layer, as required)

| Layer | MPFB | AvatarSDK | Avaturn |
|---|---|---|---|
| TalkingHead code | MIT (same for all three — VERIFIED) | MIT | MIT |
| Generator software | Blender: GPL (not a redistribution concern for output); MPFB extension: open source | Proprietary, commercial SaaS | Proprietary, commercial SaaS |
| Base human model/body meshes | **CC0/CC-BY** (MakeHuman ecosystem — VERIFIED from TalkingHead's README) | Proprietary to AvatarSDK; exact weights/model license **NOT VERIFIED** beyond "commercial plan required" | Proprietary to Avaturn; **NOT VERIFIED** beyond "non-commercial by default, negotiate for commercial" |
| Textures/skins | CC0/CC-BY per MakeHuman ecosystem, but community reports stock quality is weak (§3) — may need custom/purchased textures with their own separate license | Generated/proprietary, bound by AvatarSDK's commercial terms | Generated/proprietary, bound by Avaturn's commercial terms |
| Hair assets | Part of MakeHuman asset packs — CC0/CC-BY | Proprietary/bundled | Proprietary/bundled |
| Clothing assets | Part of MakeHuman asset packs (CC0/CC-BY) but reported low-detail; any custom/purchased clothing asset carries its own separate license, checked independently | Proprietary; "business" outfit style confirmed to exist as a vendor feature, license bound to the commercial plan | Proprietary; custom garment pipeline exists for developers, license terms not independently verified |
| Exported GLB (the actual file you'd ship) | **CC0-equivalent** if built entirely from stock MakeHuman/MPFB assets — the cleanest of the three | Commercial — requires an active paid AvatarSDK plan to use commercially | Non-commercial by default; commercial requires a separate agreement with Avaturn |

**The task's own warning is directly validated here**: none of these three
candidates' licensing can be collapsed into "the code is MIT, so the
avatar is free." MPFB is the only one where the *generated avatar itself*
is unambiguously, fully commercially clean without any separate
negotiation — the other two require an active paid relationship with a
third-party vendor to use commercially, confirmed from each vendor's own
stated terms (not assumed from their marketing).

---

## 7. Performance considerations

- TalkingHead's animation system runs entirely in the browser on the
  CPU/GPU-via-WebGL rendering pipeline that Three.js already uses — there
  is **no server-side GPU inference involved in TalkingHead itself**,
  regardless of which GLB is loaded. This is unrelated to — and should
  not be confused with — the separate `ai-avatar-system` project's
  MuseTalk GPU requirement investigated elsewhere in this repo's history;
  that is a completely different, 2D-diffusion-based lip-sync approach.
- **GLB file size**: not independently benchmarked this pass for any of
  the three candidates specifically. Expect it to scale with texture
  resolution and whether hair is modeled as geometry/cards vs. a flat
  texture — this should be measured directly once a candidate avatar is
  actually produced, not assumed.
- **Blendshape count impact**: TalkingHead already drives up to 81 morph
  targets per avatar in the bundled examples (confirmed this session) with
  no reported performance issue in this repo's own testing — adding
  ARKit + Oculus shapes to a new MPFB/AvatarSDK/Avaturn avatar is not
  expected to introduce a new performance class of problem, but this is
  an inference from the existing bundled-avatar testing, not a direct
  benchmark of a new MPFB/AvatarSDK/Avaturn export (**NOT VERIFIED** for
  these specific candidates).
- **GPU requirement**: none beyond ordinary WebGL, confirmed by this same
  session's own POC running correctly under headless Chrome with
  **software-only SwiftShader rendering** (no real GPU at all) — a strong
  signal this is a genuinely low-hardware-requirement rendering path.

---

## 8. Main technical challenges and risks

1. **MPFB's realism ceiling requires real manual work** (§3) — the
   Blender/rig/export pipeline is solved and documented, but a
   professional, non-"default MakeHuman look" result depends on sourcing
   or creating better skin textures and formal clothing than the stock
   asset packs provide. This is an art/asset-sourcing risk, not a
   technical/engine risk.
2. **AvatarSDK's eye-gaze reconstruction is the single riskiest technical
   step across all three candidates** — `build-avatarsdk-eyes.py`'s fixed
   rotation angles (±20–30°) are tuned defaults, not guaranteed correct
   for every exported model's eye socket geometry; a bad result here
   would visibly break gaze, one of the four animation features this
   task explicitly requires to be preserved.
3. **No confirmed ARKit path for AvatarSDK or Avaturn** — if the richer
   52-shape expression system matters for a more natural resting/talking
   face, only MPFB currently has a demonstrated path to it; the other two
   would need their own discovery/mapping work, unverified as even
   possible without direct testing.
4. **Avaturn's exact commercial terms are unresolved** — "notify the
   company" is not a quoted price or contract; budget/timeline risk if
   this project needs a firm number before committing.
5. **AvatarSDK's pricing tiers were found only on third-party sites, not
   confirmed on avatarsdk.com directly** — same category of risk, lower
   severity since at least tier names and rough price bands exist.
6. **None of the three candidates has been test-exported and loaded into
   TalkingHead in this research pass** — every GLB-level compatibility
   claim above is based on scripts/docs/the bundled `avaturn.glb` example,
   not a freshly-generated professional-female avatar from any of the
   three. This is the single biggest remaining verification gap before
   any of this plan can be trusted end-to-end.

---

## 9. Recommended candidate

Ranked per the task's own stated priority order (realistic appearance >
TalkingHead compatibility > lip-sync > eye movement/blinking > ease of
integration > commercial licensing > browser performance > maintenance):

**MPFB is the recommended candidate**, with Avaturn as the pragmatic
fallback if the licensing/budget conversation with Avaturn resolves
favorably and MPFB's manual texture/clothing work is judged too costly.

- **Realistic appearance**: no candidate here is a confirmed one-click
  photoreal win (§3) — this is the weakest-evidence criterion across the
  board. MPFB's base mesh/face shape is reported as genuinely decent;
  its gap is finishing work (texture/clothing), which is addressable with
  effort. AvatarSDK/Avaturn's realism is vendor-claimed, not independently
  benchmarked either.
- **TalkingHead compatibility**: MPFB wins decisively and verifiably —
  it is the only candidate with a complete, first-party, author-maintained
  rig/weights/add-on/pose-library package. Avaturn is simpler to load but
  has no ARKit path confirmed; AvatarSDK has a real, nontrivial gap (eye
  gaze must be reconstructed from scratch).
- **Lip-sync**: equal across all three once visemes are correctly named —
  not a differentiator.
- **Eye movement/blinking**: MPFB and Avaturn both work via standard
  export; AvatarSDK is confirmed to need real reconstruction work here —
  a concrete point against it.
- **Ease of integration**: Avaturn wins this single criterion outright
  (zero Blender work) — but it ranks below realistic-appearance and
  TalkingHead-compatibility in the task's own priority order, so this
  doesn't change the overall recommendation.
- **Commercial licensing**: MPFB wins decisively — fully CC0/CC-BY at
  every layer, no vendor relationship required, no price negotiation, no
  revenue-threshold clause to track. AvatarSDK and Avaturn both require
  an ongoing paid/negotiated commercial relationship with a third party.
- **Browser performance**: no meaningful difference expected (§7),
  though none of the three has been directly benchmarked yet.
- **Maintenance/long-term suitability**: MPFB again wins — a self-hosted
  Blender pipeline producing a CC0 asset has no recurring vendor
  dependency, pricing risk, or API deprecation risk; AvatarSDK/Avaturn
  both carry ongoing commercial/vendor-relationship risk by nature.

---

## 10. Step-by-step future implementation plan (not implemented — plan only)

1. **Resolve the appearance question first, concretely**: build one real
   MPFB avatar following `MPFB.md` end to end, including sourcing at
   least one better-than-stock skin texture and one formal/business
   outfit asset, and export it. This single step resolves the single
   biggest open risk in this report (§8.6) and the single most important
   requirement in the task ("realistic, professional... not merely a
   beautiful static character" — language echoed from this repo's other
   research in this area).
2. **Apply the already-proven lighting fix** from
   `reports/GitHub Talking Avatar Alternatives Research.md` §10b to
   whatever avatar results — this is independent of avatar source and
   known to materially improve perceived realism.
3. **Load the new GLB into the existing TalkingHead POC** (`poc/
   talkinghead-poc/`, already set up and git-isolated from `src/` in this
   repo) and re-run the same empirical tests already proven to work in
   this session: lip-sync via `streamStart()`/`streamAudio()` fed from
   this project's own real viseme-detector output, autonomous blink
   sampling, `lookAt()` gaze sampling, and `setMood()` expression
   sampling — confirming all four required behaviors survive the avatar
   swap, not assuming they will.
4. **Only if MPFB's realism ceiling proves insufficient after step 1**,
   open a priced, scoped conversation with AvatarSDK (confirm current
   Pro-tier pricing directly, not via third-party listings) or Avaturn
   (get an actual commercial quote, not "notify the company") as a
   fallback, budgeting real time for AvatarSDK's eye-gaze reconstruction
   work specifically if that path is chosen.
5. **Only after an avatar passes step 3** should any `src/renderer.ts`
   integration work begin — this report, like the sibling TalkingHead
   research in this repo, does not recommend touching production code
   before a specific, tested avatar exists.

---

## Conclusion

**Can we retain TalkingHead's existing lip-sync, eye movement, blinking
and head movement features while replacing its cartoon avatar with a
realistic, professional human interviewer?**

**Yes — architecturally confirmed, with one real condition.** TalkingHead's
animation engine is already avatar-agnostic by design (§1, §5): swapping
the GLB requires zero changes to the lip-sync, blink, gaze, or head-movement
code, only a correctly-rigged, correctly-named GLB. This is not a
hypothesis — it's how TalkingHead's own author already supports five
different avatar sources, confirmed by reading the actual conversion
scripts, not assuming from the README.

**Best option: MPFB/MakeHuman**, specifically because it is the only
candidate with (a) a complete, author-maintained TalkingHead integration
package, (b) a fully open, unambiguous CC0/CC-BY license at every asset
layer with no third-party commercial relationship required, and (c)
confirmed, working Oculus-viseme and ARKit export paths. Avaturn is the
easiest to wire in technically (zero Blender work) and is a reasonable
fallback; AvatarSDK is the weakest of the three on compatibility (eye
gaze must be rebuilt from nothing) despite offering the most explicit
"business attire" option on paper.

**Necessary modifications**: build a real MPFB avatar with better-than-
stock skin texture and a sourced formal-business clothing asset (the
pipeline is proven; the *inputs* need upgrading); apply the already-
documented lighting fix; load and re-test against this project's own real
audio/viseme pipeline before touching any production code.

**Remaining blockers — real, not hypothetical**: (1) no candidate's
realistic/professional appearance has been proven by actually rendering
one — this report found strong architectural compatibility evidence but
only mixed, partly-unverified evidence on final visual quality, honestly
reported as such; (2) AvatarSDK's and Avaturn's commercial terms are not
pinned down to firm, current, vendor-confirmed numbers; (3) no avatar from
any candidate has yet been round-tripped through the actual TalkingHead
engine in this repo to empirically confirm all four required behaviors
survive the swap — that is the necessary next step, not yet done.

**Verdict: PARTIAL FIT for all three candidates, with MPFB as the clear
leader** — the integration *path* is proven and low-risk; the avatar
*quality* outcome is not yet proven and is this plan's real remaining
work, not a licensing or engine-compatibility question.

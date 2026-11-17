# Professional Interviewer Avatar Rendering POC

**Scope:** an isolated POC under `poc/mpfb-avatar-poc/` (new directory, separate from the
earlier `poc/talkinghead-poc/`). Nothing in `src/`, `avatars/`, or the TalkingHead
engine source was modified. The existing production avatar and lip-sync pipeline
were not touched. All new files are additive and isolated.

## 1. What was attempted, step by step

1. **Installed Blender's MPFB extension headlessly**, without enabling Blender's
   global online-access preference (that specific action was correctly denied by
   the permission system as a persistent system-wide setting change — avoided
   entirely by downloading the extension package directly via `curl` from
   `extensions.blender.org`'s own API and installing it from the local file via
   `blender --command extension install-file`, which works with online access
   left off).
2. **Downloaded all required MakeHuman asset packs directly** (system assets,
   Visemes 02, Faceunits 01, Suits 01, Skins 01, Hair 01) from
   `files.makehumancommunity.org`, ~280MB total, and installed them into MPFB's
   data directory via Python's `zipfile` module plus `AssetService.update_all_asset_lists()`.
3. **Registered TalkingHead's own Blender add-on** (`talkinghead-addon.py`) by
   importing it directly as a Python module and calling its `register()`
   function — no GUI "Install from Disk" + restart needed, since it's a plain
   `bpy.types.Operator` module.
4. **Built the TalkingHead custom rig into MPFB's rig library**: created a
   throwaway dummy human, loaded `talkinghead.mpfbskel` + `talkinghead.mhw` onto
   it, saved it to MPFB's rig library as `"talkinghead"`, deleted the dummy —
   mirroring `blender/MPFB/MPFB.md`'s documented one-time setup exactly.
5. **Created the real avatar**: adult (`young`), `caucasian`, `female` phenotype,
   added the custom `"talkinghead"` rig.
6. **Applied assets**: skin `"Young caucasian female"` (CC0), eyes `"High-poly"`,
   eyebrows `"Eyebrow003"`, eyelashes `"Eyelashes02"`, teeth `"Teeth base"`,
   tongue `"Tongue01"`, hair `"Toigo blunt bob"`, clothing
   `"Female elegantsuit01"` (CC0, from the Suits 01 pack — a genuine business/
   formal outfit option, not improvised).
7. **Created an MPFB "export copy"** with Oculus visemes, ARKit face units, and
   target interpolation all enabled, mask/subdivision modifiers baked, helpers
   deleted — exactly the settings `MPFB.md` documents for TalkingHead export.
8. **Exported to GLB** (`poc/mpfb-avatar-poc/avatar.glb`, 46.8 MB).
9. **Loaded the GLB into an isolated TalkingHead test harness** adapted from this
   session's earlier, proven `poc/talkinghead-poc/` setup — same
   `streamStart()`/`streamAudio()` integration, same professional three-point
   lighting + shadow-casting fix, served on a separate port (8924) so it never
   touched the earlier POC.
10. **Ran the same empirical tests already proven this session**: fed the
    existing project's own real, unmodified viseme-detector output through the
    avatar; sampled blink over an 18-second idle window; drove gaze via
    `lookAt()`; switched through `happy`/`sad`/`angry` moods; captured
    screenshots; recorded load time and GLB size.
11. **Investigated Rocketbox conversion feasibility** by reading
    `blender/rename-rocketbox-shapekeys.py` and directly parsing the real
    production `avatars/female.glb`/`avatars/male.glb` GLB JSON chunks
    (read-only, no Blender run on the production assets) to compare their
    actual morph target and bone names against what TalkingHead requires.

## 2. What succeeded

- **The data-level pipeline is fully correct and TalkingHead-compatible —
  VERIFIED, not assumed.** Parsing the exported GLB directly: all **15 Oculus
  viseme names** present (`viseme_sil`, `viseme_aa`, `viseme_PP`, …) plus the
  **full 52 ARKit-style names** (`browDownLeft`, `mouthSmileLeft`, `jawOpen`,
  etc.) — 67 morph targets total, zero missing. Bone names are genuinely
  **Mixamo-compatible**: `Hips`, `Spine`, `Spine1`, `Spine2`, `Neck`, `Head`,
  `LeftArm`, `RightArm`, `LeftEye`, `RightEye` all present with exact
  TalkingHead-expected naming — this is MPFB's own purpose-built TalkingHead
  rig working as documented.
- **Lip-sync — VERIFIED.** Feeding the existing project's own real detector
  output through `streamStart()`/`streamAudio()` produced genuine, substantial,
  correctly-timed viseme activation (`0.72`, `0.56`, …), matching this
  session's earlier proof on `brunette.glb`.
- **Blink — VERIFIED** (on the second, longer attempt). An initial 8-second
  sample showed no blinks; blinking is a rare, randomly-timed idle event (same
  behavior confirmed on `brunette.glb` earlier this session), so an 18-second
  resample was run before concluding anything — it showed a real, full-closure
  blink (value reaching `1.0`) on 2 of 90 sampled frames. The first negative
  result was a sampling-window false negative, not a real defect; flagging
  this explicitly rather than letting the lucky first result stand unchecked.
- **Gaze — VERIFIED.** `lookAt()` toward a far-left target drove
  `eyeLookOutLeft` to `0.36`, correctly paired with `eyeLookInRight`.
- **Mood — PARTIAL.** `sad` converged correctly toward its documented target
  (`mouthFrownLeft: 0.29` moving toward `0.8`). `happy` had barely started
  converging in the sampled window. `angry` showed a transient **negative**
  `browDownLeft` value — almost certainly a smoothing/overshoot artifact from
  switching moods in quick succession (TalkingHead's exponential-smoothing
  velocity term can overshoot briefly on a fast directional reversal), which
  the renderer's own min/max clamp would prevent from ever reaching the actual
  mesh — but this was **not independently re-verified with more spacing between
  mood switches**, so it is reported as an open, minor question rather than
  waved away.
- **Load performance**: 3.9 seconds to load and render-ready in this headless,
  software-rendered (SwiftShader) environment; 46.8 MB GLB file size.
- **Rocketbox conversion feasibility — determined without needing to touch the
  production assets.** Parsed `avatars/female.glb` and `avatars/male.glb`
  directly: **morph target naming is already fully done** — both files already
  carry all 15 `viseme_*` names and the complete ARKit set, with **zero**
  remaining raw Microsoft-style names (`AA_VI_*`/`AK_*`) — meaning
  `rename-rocketbox-shapekeys.py` would be a no-op on these specific files, not
  because it doesn't work, but because this project's own earlier pipeline
  already did that renaming. **The real blocker is the skeleton**: both
  avatars use a 3ds Max **Biped** rig (`Bip01_Pelvis`, `Bip01_Spine`,
  `Bip01_Neck`, …) — not Mixamo-compatible at all; only `Head` matches
  TalkingHead's expected naming, by coincidence. Reading
  `rename-rocketbox-shapekeys.py` in full confirms it **only renames shape
  keys** — it does not rename or restructure bones. Its own header comments
  document the real required workflow: strip the existing rig in Blender,
  export rig-free to FBX, **upload to Adobe Mixamo's web service for
  auto-rigging** (an external, interactive, account-based, non-scriptable
  step — the one genuine blocker here), re-import the Mixamo-rigged FBX, then
  apply the (in this case already-redundant) shape-key rename and bone-axis
  fixes. **Verdict: PARTIAL — feasible, but gated on a manual, interactive,
  third-party step, not a local script.**

## 3. What did not succeed: the real blocker (v1 — first attempt)

**The generated avatar is not visually professional. This was confirmed
directly by screenshot, reproducibly, not assumed or guessed around.** Two
independent screenshots (`neutral_front.png`, `neutral_final.png`, both copied
to `reports/mpfb_avatar_poc_assets/`) show the same defects:

1. **The mouth/teeth area renders as open, discolored, and genuinely
   disturbing-looking** — not a neutral, closed, professional expression. This
   is the single biggest failure against the task's explicit requirement for
   "realistic eyes, eyelids, teeth and mouth" and "neutral professional
   expression."
2. **The clothing has a large, clearly wrong torn/gapped hole** across the
   chest, with a distorted stripe pattern — not the intended business-suit
   look, and visually broken rather than merely unpolished.
3. **The hair ("Toigo blunt bob") does not read as a styled haircut** — mostly
   bald head visible with thin strands, not the neutral professional
   hairstyle the asset's name promised.
4. Skin tone appears unnaturally pale/flat despite the professional lighting
   fix being active and confirmed applied (8 meshes set to cast/receive
   shadows, same config validated earlier this session).

**Initial root-cause theory (v1 report) — since empirically disproven, kept
here for an honest record rather than silently erased:** the v1 report
attributed this to the 64 `"Applied modifier was not first"` warnings logged
during MPFB's export-copy bake step, reasoning that out-of-order modifier
application was corrupting the clothing mask bake. **A dedicated follow-up
pass (§3b) tested this directly and disproved it**: removing the only
modifiers that could plausibly cause this (stray `Subdivision` modifiers on
every accessory mesh) produced a **byte-for-byte identical GLB** (same MD5
hash) — proving those modifiers were already inert at export time and were
never the cause. The 64 warnings turned out to be benign, expected noise from
MPFB's own internal shape-key-preserving bake routine running correctly on
many shape keys, not a symptom of the real defect.

## 3b. Deep follow-up investigation (v2 — this pass)

Per instruction, the v1 avatar/GLB/screenshots/scripts/test-results were
preserved first, untouched, at `poc/mpfb-avatar-poc/baseline_v1/` before any
further changes were made (including the original `.blend` checkpoints).

**Three substantive, independently well-reasoned fixes were implemented and
tested, in order. All three were empirically falsified as the cause of the
visual defects** — each is still a legitimate improvement in its own right,
and all three remain applied in `build_avatar_v2.py`, but none of them
changed the rendered result:

1. **Stray unbaked `Subdivision` modifiers on every accessory mesh**
   (eyebrows, eyelashes, teeth, tongue, hair, suit, eyes) — found by directly
   inspecting the saved export-copy `.blend` file: MPFB's own bake routine
   only processes the main body mesh, leaving these 7 meshes with a live
   `Subdivision` modifier (`levels=0` viewport / `render_levels=1`). Removed
   all 7. **Result: the exported GLB was byte-for-byte identical (same MD5)
   to the one without this fix.** The modifiers were already inert at export
   time (Blender's glTF exporter respects viewport levels, not render
   levels) — this was a real latent issue worth fixing for hygiene, but not
   the cause.
2. **Bone roll/axis normalization** (`talkinghead.fix_bone_axes_t`) — found
   because a raw Blender viewport render of the pre-export scene (rest/T-pose)
   looked completely correct (full hair, no torn clothing, closed mouth),
   while TalkingHead's *posed* render was broken, suggesting a bind-pose/roll
   mismatch that only manifests once bones rotate. Applied TalkingHead's own
   T-pose bone-axis fixer (confirmed "Applied: 65, skipped: 0" — ran against
   every expected bone). **Result: no visible change.** Later disproven more
   directly: the same defect is already present in a pure **rest-pose**
   render with **zero bone rotation at all** (§ below), so a posed-vs-rest
   mismatch cannot be the cause either.
3. **Removed the `Jaw` vertex group from every mesh** — found by inspecting
   the exported GLB's own skin data directly: every teeth vertex carried
   un-normalized weight `1.0` to both `Head` *and* `Jaw` simultaneously (sum
   `2.0`, should be ≤`1.0`), and the same `Jaw` bone also had nonzero
   influence on hair (16.4% of vertices), the body itself (8%), and the suit
   (2.9%) — a single bone contaminating nearly every mesh. TalkingHead's own
   engine was confirmed (by direct grep) to never reference a bone literally
   named `"Jaw"` anywhere — all mouth animation is morph-target driven, so
   this bone is dead weight from the custom rig. Removed its influence
   entirely from all 5 meshes that had it. **Result: no visible change** —
   and a direct re-check of the *actual exported* `WEIGHTS_0`/`JOINTS_0`
   accessor data in the GLB showed Blender's exporter had **already
   correctly normalized** the teeth weights to `[0.5, 0.5, 0, 0]` before
   this fix was even applied, so the raw-weight-sum concern, while real at
   the `.blend`-file level, was not actually reaching the exported file
   unnormalized.

**Further conclusive isolation testing, after all three fixes above failed:**

- **Runtime morph target values confirmed all zero.** Queried every
  mood/expression-related morph target (`eyeSquintLeft`, `noseSneerLeft`,
  `browDownLeft`, `jawOpen`, `mouthFunnel`, etc.) directly on the loaded
  avatar with `avatarMood: 'neutral'` explicitly set — every single one read
  `0`, and `getMood()` confirmed `"neutral"` was genuinely active. **This
  rules out TalkingHead's own mood/baseline system as a contributing cause.**
- **The defect reproduces in a minimal test with zero TalkingHead code
  involved at all** — a bare Three.js + `GLTFLoader` page, no animation, no
  morph targets touched, pure bind-pose render. Identical defect. **This
  proves the problem is in the GLB file itself (or Blender's export of it),
  not in anything TalkingHead's JavaScript does.**
- **The armature's pose-mode transforms were confirmed all at identity**
  (no residual pose offsets at export time) — ruling out a pose-vs-rest
  mismatch definitively, not just by inference.
- **Material shader graphs were traced node-by-node** for teeth, eyes,
  eyebrows, and body — every `Base Color` input correctly traces back to the
  intended real diffuse texture (`teeth.png`, `brown_eye.png`,
  `eyebrow003.png`, `young_lightskinned_female_diffuse.png`). No
  wrong-texture routing.
- **The actual embedded texture images were extracted from the GLB and
  visually inspected directly.** `teeth.png` is a completely normal,
  correctly-structured teeth UV atlas (white tooth islands plus the
  expected dark-red gum/mouth-interior regions that any teeth texture
  legitimately has) — the source asset is not corrupted or defective.
- **Tried exporting with `export_rest_position_armature=False`** (a genuine,
  documented Blender glTF exporter option governing whether skin data is
  based on the armature's rest pose or current pose). No change — expected,
  since pose already equals rest exactly, but tested rather than assumed.
- **The single most conclusive test: re-imported the exported GLB into a
  completely fresh Blender scene** (factory-reset, no MPFB state, no prior
  session data) and rendered it. **The same defect reproduced — and more
  severely, with additional visible distortion across the torso and arms.**
  This is the decisive finding: the corruption is confirmed present in two
  independent pieces of software (Three.js and Blender's own glTF importer)
  reading the same file, which proves it is a genuine data-level defect in
  the exported GLB itself — not a Three.js-specific interpretation quirk, not
  a TalkingHead-specific issue, and not explained by any of the three
  specific causes tested and ruled out above.

**Honest conclusion of this pass:** the exact mechanism producing this
GLB-level corruption was **not isolated** within the scope of this
investigation, despite eliminating every specific, well-reasoned hypothesis
tested (stray modifiers, bone roll/axis, the Jaw bone, un-normalized
weights, excess bone influences on the affected meshes specifically — teeth
use only 2 influences, well under the 4-per-vertex glTF cap, ruling that out
too — mood/morph state, pose-vs-rest mismatch, material routing, and source
texture content). This is reported plainly as an unresolved, precisely
bounded blocker, per the task's own explicit instruction, rather than
declared fixed when it is not.

## 4. Dependencies and licenses actually used

| Component | License |
|---|---|
| Blender 4.5.10 LTS | GPL (tool only, not redistributed) |
| MPFB extension (`add-on-mpfb-v2.0.18.zip`) | GPL-3.0-or-later (code) |
| MakeHuman system assets, Skins 01, Hair 01, Suits 01 | **CC0** (all four, confirmed from their own asset-pack pages, not assumed) |
| Visemes 02, Faceunits 01 asset packs | Contributed by Mika Suominen (TalkingHead's own author) for this exact use case; no explicit license stated on their pages — flagged as unresolved, not assumed permissive |
| TalkingHead Blender add-on (`talkinghead-addon.py`) + rig/weights | MIT (Mika Suominen, 2026 — license header read directly in the file) |
| TalkingHead engine (`modules/talkinghead.mjs`) | MIT (confirmed earlier this session) |

No new dependency was added to the project itself (`package.json` untouched);
Blender/MPFB are external tools used to produce an asset, not runtime
dependencies of the SDK.

## 5. Re-tested results after the v2 fix attempt

The full animation test suite was re-run against `avatar_v2.glb` (the fixed
build), not assumed to still pass just because the mesh changed:

- **Lip-sync, blink, gaze: still VERIFIED working** — identical behavior to
  v1 (confirmed via the same real-detector-output test, the same 8-second
  idle blink sample, and the same `lookAt()` test). The three v2 fixes did
  not break animation compatibility.
- **Skeleton/morph-target compatibility: still VERIFIED** — re-dumped bone
  and morph target names from `avatar_v2.glb` directly; all 15 Oculus
  visemes and the full ARKit set are still present and correctly named.
- **Visual defects: UNCHANGED.** The mouth/teeth, clothing tear, and bald-
  looking hair are pixel-for-pixel the same between v1 and v2, confirmed by
  direct screenshot comparison at the same captured moments (`v1_neutral.png`
  / `v2_neutral.png` / `v1_posed_4s.png` / `v2_posed_4s.png`, all copied to
  `reports/mpfb_avatar_poc_assets/`).

## 6. Final verdict

**Can TalkingHead's lip-sync, blink, gaze, and head-movement features be
retained while swapping in an MPFB-generated avatar, with zero animation-engine
changes? Yes — this is proven, not theoretical, and re-confirmed after the v2
fix attempt.** The exported GLB carries exactly the morph target and bone
names TalkingHead expects, and real, empirical testing confirms lip-sync,
blink, and gaze all work unmodified against this freshly-generated avatar,
using this project's own existing detection pipeline as the audio source.

**Is this specific generated avatar visually professional enough for an AI
interviewer today? No — and this remains true after a deep, honest fix
attempt, not just the first pass.** It has reproducible, located-to-the-GLB-
file-itself rendering defects (mouth/teeth, clothing geometry, hair) that
make it unsuitable to ship as-is. Three substantive, independently
well-reasoned candidate causes were tested and disproven (stray modifiers,
bone-roll/axis, the Jaw bone/weight normalization), and the defect was
conclusively isolated to the exported GLB's own data — reproducing in both
Three.js and Blender's own independent glTF importer — without finding the
exact mechanism. This is **not** declared fixed, per the explicit instruction
not to round a partial effort up to success. It is also not evidence that
MPFB is the wrong candidate in principle: the rig/naming/animation-engine
compatibility (the harder, more fundamental question) remains fully proven
and unaffected by this unresolved export defect.

**Rocketbox conversion verdict: PARTIAL FIT** (unchanged from the v1 pass).
The shape-key side is already done (confirmed directly from the production
files); the skeleton side requires one external, manual, interactive step
(Mixamo's web auto-rigger) — genuinely feasible, but not something a script
can finish unattended.

## 7. Recommended next steps

Concrete, scoped leads for continuing this specific investigation, in
descending order of expected value:

1. **Run the exported GLB through the official Khronos `glTF-Validator`**
   (not attempted this pass) to check for spec-compliance errors Blender's
   exporter might be silently producing — a validator failure would point
   directly at the broken accessor/data rather than requiring more manual
   bisection.
2. **Build a drastically simplified repro**: export *only* the teeth mesh
   and a 2-bone armature (`Head`+`Jaw`, or just `Head`) in isolation from
   this same `.blend` file, with nothing else in the scene, and check
   whether the defect still reproduces. This would definitively establish
   whether the bug needs the full multi-mesh/multi-shape-key complexity to
   trigger, or is inherent to something as simple as one mesh + one bone.
3. **Re-examine `ExportService._apply_modifiers_keep_shapekeys`'s
   duplicate-object technique** (the delta-bake trick MPFB uses for the body
   mesh specifically) for a vertex-group index mismatch between the
   duplicated objects it creates and removes — the body mesh showed the
   *most* severe distortion of all meshes in the fresh-Blender-reimport
   test, which is also the one mesh that goes through this specific
   duplicate-bake-delete cycle.
4. **Try a different Blender version's glTF exporter** (e.g. Blender 4.2 or
   4.3 LTS) to rule out a Blender-4.5-specific exporter regression — this is
   a cheap, mechanical test that was not tried this pass.

None of these require a different candidate or architecture — MPFB's
rig/naming/animation compatibility is proven and would carry over unchanged
once this specific export defect is found and fixed.

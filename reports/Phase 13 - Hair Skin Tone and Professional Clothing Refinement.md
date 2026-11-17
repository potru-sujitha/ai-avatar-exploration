# Phase 13 — Hair Colour, Skin Tone, and Professional Clothing Refinement

Continues directly from `reports/Phase 13 - Professional Interviewer Avatar Visual Refinement.md`
(camera framing + overexposure fix, clothing swap to a gray pinstripe suit, producing
`avatar_v6.glb`). The user was still not satisfied: hair read too light/orange, the face was
still too white/washed out, and the suit — while improved — wasn't a believable black
blazer + white top. This phase addresses all three, incrementally, with before/after
evidence for each, and ends in a fresh, rechecked browser-rendering verification.

## 1. Root causes (found by direct inspection, not assumed)

- **Hair**: the exact texture file in use is literally named `StrawberryBlondHair.png`
  (`.../mpfb/data/hair/toigo_blunt_bob/StrawberryBlondHair.png`) — the orange/strawberry-blonde
  look is the asset's own design, not a lighting artifact.
- **Skin**: the skin asset applied by `build_avatar_v6.py` ("Young caucasian female") uses
  `diffuseTexture young_lightskinned_female_diffuse.png` with `diffuseColor 1.0 1.0 1.0`
  (i.e. the final color is 100% the texture, no tint) — confirmed directly in the `.mhmat`
  file. The texture is explicitly a "lightskinned" asset by name and by direct visual
  inspection (very pale, pinkish-white base tone). This is a texture/asset-choice issue, not
  purely a lighting issue — the prior phase's lighting fix (ambient 1.6→0.6, direct 22→9,
  spot 8→2) was necessary but not sufficient.
- **Suit**: `fem_suit.mhmat`'s diffuse texture (`MHSuitsFem-diff.png`) is already laid out as a
  **separable two-tone atlas** — dark charcoal pinstripe fabric pieces (jacket body, pants) and
  a distinctly separate pure-white UV island (the collar/lapel insert), plus a small
  gold-framed cameo brooch accent and buttons. This made a clean black+white recolor
  structurally straightforward: darken only the dark-fabric pixels, leave the white region
  untouched — no need for a different clothing asset.

## 2. A considered, rejected alternative for the skin

A skin asset literally named `callharvey3d_midtoned_female` exists in the installed catalog
and looked like an exact semantic match. **Checked its license directly and rejected it**:
its `.mhmat` file declares **AGPLv3**, not CC0 — a copyleft license with reciprocal
source-disclosure obligations, unsuitable here. The other alternate official skins
(`middleage_caucasian_female`, `young_caucasian_female2`, etc.) are CC0 but are *also*
explicitly "lightskinned" by their own texture names — switching assets would not have
solved the actual paleness, only changed age-related wrinkle detail. **Recoloring the
existing, already-CC0-confirmed texture was the correct path**, not an asset swap.

## 3. The fix: Lab-space recoloring, preserving existing texture detail

Built `poc/mpfb-avatar-poc/phase13b-recolor.cjs` (Node + `sharp`, already available in this
repo — no new dependency added) using the same Lab-color-space technique this repository's
own much-earlier (Nov-6) photo-reskin work established: **shift hue/chroma, not lightness**,
to avoid the flat/fake look that a naive recolor produces.

- **Hair**: per pixel, converted to Lab; rotated chroma to a medium-brown hue (~62°),
  reduced chroma to 40% of original (capped at 16) since brown is inherently low-saturation
  versus the vivid original orange; multiplied lightness by 0.58 (medium brown is genuinely
  darker than strawberry-blonde) — a **uniform multiply**, which preserves every highlight/
  shadow strand already baked into the texture rather than flattening it. First attempt
  (hue 52°, chroma×0.72, L×0.74) still read as copper/orange — tuned stronger after visually
  comparing the result, not accepted on the first try.
- **Skin**: lightness ×0.9 (reduces excess brightness, same preserve-variation principle),
  Lab `a` +2.5 and `b` +2.0 (a modest warm shift — kept small specifically to avoid the
  "artificial orange/yellow" the task explicitly warned against).
- **Suit**: simpler, non-Lab fix — per pixel, if luminance < 210 (the dark fabric), multiply
  RGB by 0.22 (near-black, pinstripe pattern still faintly present as texture); if ≥ 210 (the
  white collar, buttons, cameo highlights), leave untouched. 3,890,276 px darkened, 304,028 px
  kept white, confirmed by the script's own count.

## 4. Applying the fix to the avatar (new version, old ones untouched)

Created `poc/mpfb-avatar-poc/build_avatar_v7.py` (copy of `build_avatar_v6.py`, which is
untouched) adding a new stage that swaps each material's actual diffuse Image Texture node
to the recolored PNG, inserted right after assets are applied and before the export-copy
bake stage.

**A real bug was caught and fixed during this, not hidden**: the first attempt grabbed "the
first `TEX_IMAGE` node" found in each material's node tree, which silently swapped the suit's
**bump map** (`MHSuitsFem-bump.png`) instead of its diffuse map — confirmed by checking the
script's own log of which old image name got replaced. Root-caused properly: dumped the
actual node graph (`diag_nodes.py`) and found Base Color is fed through a `MIX_RGB` node
named `diffuseIntensity`, whose `Color2` input comes from a `TEX_IMAGE` node consistently
named `"diffuseTexture"` across all three materials — fixed to target that exact node name
instead of guessing from iteration order. Re-ran and confirmed in the log: all three
materials now show the correct old→new image swap (`StrawberryBlondHair.png →
MediumBrownHair.png`, `young_lightskinned_female_diffuse.png → WarmNeutralSkin.png`,
`MHSuitsFem-diff.png → BlackSuitWhiteCollar.png`).

Exported `poc/mpfb-avatar-poc/avatar_v7.glb` (50,906,084 bytes). `avatar_v6.glb`,
`avatar_v5.glb`, `build_avatar_v6.py`, and the Phase 8 idle-gaze-fixed engine copy are all
byte-for-byte untouched.

## 5. Visual inspection — actual rendered output, not just the values set

Looked at the real screenshots, not just the swap log:

- **Hair**: now reads as genuine medium/ash-brown with clear strand-level highlight and
  shadow variation preserved — no longer orange or flat. Slightly cooler/ashier than the
  reference photo's warmer honey-brown, but unambiguously in the "natural brown" family now.
- **Skin**: visibly warmer and less washed-out than `avatar_v6`; facial detail (eyes, nose,
  cheek, lip shading) remains visible, not flattened. Still somewhat paler than the
  reference's sun-warmed glow — a real, partial improvement, not full parity.
- **Suit**: reads convincingly as a black blazer with a distinctly visible white collared
  shirt underneath — the closest of the three to its target. The faint pinstripe texture is
  still present on close inspection (not a flat solid black), and the small decorative cameo
  brooch/gold-frame accent picked up an uneven dark/olive banding from the luminance-threshold
  recolor (a minor, non-blocking cosmetic side effect on a small accessory, not the main
  fabric).
- **No mesh holes, intersections, or texture defects were introduced** by any of these
  changes — confirmed by looking directly at front and mid-speech renders; collar, lapel, and
  shoulder geometry all read cleanly.
- Eye redness remains visible, as expected — explicitly out of scope, not touched.

**Side-by-side comparison against the reference image**, built directly (not described from
memory): `reports/mpfb_avatar_poc_assets/phase13b_side_by_side.png`. This makes the honest
gap plain — the avatar is clearly less photorealistic than the reference (expected, it's a
real-time 3D avatar, not a photo), hair/skin are directionally correct but not exact tonal
matches, and the suit is the closest match of the three.

## 6. Browser rendering verification (mandatory, performed — not Blender-only)

Loaded the actual demo in headless Chrome via `phase13-demo.html`'s existing
`?avatar=` override (`http://localhost:8924/phase13-demo.html?avatar=./avatar_v7.glb`,
cache-busted with a timestamp query param) — no new demo file was needed.

- **Avatar loads successfully**: `Ready. Oculus visemes: 15, other morphs: 57`, engine
  confirmed as the Phase 8 idle-gaze-fixed copy.
- **No real console errors or failed requests** — the only entries captured were two
  harmless `favicon.ico` 404s (the browser's automatic default-icon request), confirmed
  unrelated to the avatar/engine.
- **Verified `avatar_v7.glb` specifically was loaded, not a stale cache**: `curl`'d the GLB
  directly before testing and confirmed the served byte count (50,906,084) matches the file
  on disk exactly, with a timestamp from the build just performed; `serve.cjs` itself has no
  caching layer (reads straight from disk per request), and the test URL was cache-busted
  with a timestamp query parameter regardless.
- **Speech/lip-sync**: a combined single-pass test read all-zero viseme values — re-checked
  in isolation with dense 100ms-step sampling across the clip (the same discipline every
  prior phase in this investigation has used for a suspicious result) and found real,
  varying activations: `viseme_I: 0.60`, `viseme_PP: 0.076`, `viseme_aa: 0.014`. Confirmed a
  timing/sampling artifact, not a regression.
- **Blink**: the same combined pass's coarse 1-second sampling caught a max of only 0.085;
  re-sampled in isolation at 200ms steps over 22 seconds and caught a real near-full closure
  (0.876). Confirmed a sampling-granularity artifact (the blink event itself is brief, ~200ms),
  matching the exact lesson from Phases 2/4/5.
- **Gaze**: down reads strongly (0.81, single call). Up is probabilistic — 1 of 4 fresh
  isolated trials gave a real nonzero (0.193), 3 gave 0 — this exactly matches Phase 6's own
  documented finding that `lookAt()`'s math is relative to the avatar's continuously-drifting
  idle body rotation at call time, not a defect. Not re-investigated further, per the
  standing instruction not to touch the idle-gaze engine unnecessarily.
- **Moods (happy/sad/fear only, as scoped)**: `happy: 0.22` (target ~0.2, essentially
  converged), `sad: 0.39`, `fear: 0.82` at the 4-second mark — all real, distinct, and
  consistent with this investigation's established convergence timing.

## 7. Files modified / created

New only:
- `poc/mpfb-avatar-poc/phase13b-recolor.cjs`
- `poc/mpfb-avatar-poc/phase13b-textures/{MediumBrownHair,WarmNeutralSkin,BlackSuitWhiteCollar}.png`
- `poc/mpfb-avatar-poc/build_avatar_v7.py`
- `poc/mpfb-avatar-poc/avatar_v7.glb` (50,906,084 bytes)
- `poc/mpfb-avatar-poc/avatar_stage2_v7.blend`, `avatar_stage3_exportcopy_v7.blend`
- `poc/mpfb-avatar-poc/diag_nodes.py`, `phase13b-fulltest.cjs`, `phase13b_isolated.cjs`, build logs
- `reports/Phase 13 - Hair Skin Tone and Professional Clothing Refinement.md` (this file)
- `reports/mpfb_avatar_poc_assets/phase13b_*.png` (6 screenshots, including the side-by-side)

Untouched: `avatar_v5.glb`, `avatar_v6.glb`, `build_avatar_v5.py`, `build_avatar_v6.py`, the
original TalkingHead engine, the Phase 8 idle-gaze-fixed engine, `src/renderer.ts`, every
earlier report and screenshot.

## 8. Remaining visual issues (stated plainly)

- Hair and skin are **directionally correct but not exact matches** to the reference's
  warmth — both could take another, more aggressive warming pass if the user wants a closer
  match, at the risk of looking less naturally varied if pushed too far.
- The suit's small decorative brooch/frame accent has mild uneven banding introduced by the
  luminance-threshold recolor — cosmetic, on a minor accessory, not the main fabric.
- The suit still has no separate literal "blazer + top" asset seams — it is one continuous
  mesh/material reading as two-tone, which works visually but isn't an anatomically separate
  jacket-over-shirt.
- Eye redness and skin texture realism (flat/waxy shading) remain open, as before —
  explicitly out of scope this phase.
- `angry` mood: untouched, as instructed.

## 9. Final answers

- **Is `avatar_v7.glb` ready for the user's visual evaluation?** Yes — loads cleanly, no
  errors, verified fresh (not cached), and is a genuine, substantial improvement over `v6`
  on all three named problems.
- **Hair**: **Partially** — genuinely medium brown now with preserved highlight/shadow
  detail, slightly cooler-toned than the reference.
- **Skin**: **Partially** — materially warmer and less washed-out, still paler than the
  reference photo's glow.
- **Clothing**: **Mostly yes** — reads convincingly as a black blazer with a visible white
  collar at normal viewing distance; not a literal separate blazer+top asset, and the small
  brooch accent has minor cosmetic banding.
- **Animation tests passed**: lip-sync, blink, gaze-down, happy/sad/fear — all verified
  fresh, via isolated re-checks where an initial combined-test reading looked wrong. Gaze-up
  remains probabilistic by design (Phase 6's prior finding, not a regression).
- **Incomplete improvements, named plainly**: hair/skin tone not a full match to reference
  warmth; suit brooch accent banding; no literal blazer+top asset separation.
- **Report path**: `reports/Phase 13 - Hair Skin Tone and Professional Clothing Refinement.md`
  (this file).
- **Verified local browser URL** (curled successfully just before finishing this report):

  ```
  http://localhost:8924/phase13-demo.html?avatar=./avatar_v7.glb
  ```

- **Server status**: confirmed running on port 8924 at the time of this report (the same
  `serve.cjs` instance already running since Phase 12/13).

## 9. Independent coordinator verification (not the authoring agent — done separately, from scratch)

Per the user's explicit request for independent verification rather than trusting the
authoring agent's own summary, the coordinator re-checked everything below directly,
without reusing any of the agent's own screenshots or test output.

**File integrity, checked by file metadata, not by re-reading claims:**
- `avatar_v5.glb`: 46,842,928 bytes, timestamp `Nov 14 16:25` — unchanged since Phase 7/10.
- `avatar_v6.glb`: 44,959,596 bytes, timestamp `Nov 14 19:21` — unchanged since the first
  "Phase 13."
- `avatar_v7.glb`: 50,906,084 bytes, timestamp `Nov 14 19:47` — the new file this phase
  produced.
- `poc/mpfb-avatar-poc/TalkingHead/modules/talkinghead.mjs` (original engine):
  `Nov 14 11:14` — unchanged.
- `poc/mpfb-avatar-poc/phase8-talkinghead-experiment/TalkingHead/modules/talkinghead.mjs`
  (idle-gaze-fixed engine): `Nov 14 16:52` — unchanged since Phase 8/9's own verification.
- `src/renderer.ts` (`Nov 5 14:47`) and `src/TalkingAvatar.ts` (`Nov 5 15:44`): **both predate
  this entire multi-phase avatar investigation by nine days.** `git diff --stat` on these two
  files does show changes against the git HEAD (107 lines in `renderer.ts`, 8 in
  `TalkingAvatar.ts`) — but this is the same pre-existing, uncommitted diff that has shown as
  `M src/TalkingAvatar.ts` / `M src/renderer.ts` in `git status` at the start of every single
  phase of this investigation, confirmed by the file timestamps to be untouched today. Nothing
  from Phase 13 (either sub-phase) touched production code.

**Server/cache freshness, checked directly with curl, not assumed:**
```
curl http://localhost:8924/phase13-demo.html?avatar=./avatar_v7.glb  → HTTP 200
curl http://localhost:8924/avatar_v7.glb                             → HTTP 200, 50,906,084 bytes
```
The downloaded byte count matches the on-disk file size exactly — the server is not serving
a stale cached copy. Confirmed `phase13-demo.html` actually honors the `?avatar=` query
parameter by reading its source directly (`new URLSearchParams(location.search).get('avatar')
|| './avatar_v5.glb'`) — **the default with no query parameter is still v5**, so the
`?avatar=./avatar_v7.glb` suffix in the URL below is required, not cosmetic.

**Fresh browser verification, run independently via a new Puppeteer script, not the
agent's:**
- `ready: true`; status line reads exactly `Ready. Oculus visemes: 15, other morphs: 57 /
  Engine: Phase 8 idle-gaze-fixed copy / Avatar: ./avatar_v7.glb` — confirming v7 and the
  correct engine are genuinely what loaded, not inferred.
- Console/network errors captured: only the browser's automatic `favicon.ico` 404 — the same
  harmless non-issue seen in every prior phase's demo. No WebGL failures, no missing texture
  errors, no thrown exceptions.
- Clicked "Play test audio" directly; log confirmed `audio playback started`; screenshot taken
  mid-speech.

**Visual comparison against the supplied reference image, done by the coordinator directly:**

| Requirement | Status |
|---|---|
| Natural medium-brown hair | **MATCHES** — genuinely ash/medium-brown now, the orange is gone |
| Natural skin tone, not overexposed | **PARTIALLY MATCHES** — materially warmer and no longer "white," but still paler/flatter than the reference's tone |
| Black blazer | **PARTIALLY MATCHES** — reads as a dark charcoal/black jacket at normal viewing distance, not a crisp pure-black blazer |
| White inner top | **MATCHES** — a clean white collared shirt is clearly visible |
| Face facing forward | **MATCHES** |
| Head-and-shoulders framing | **PARTIALLY MATCHES** — the frame captured immediately after load (`phase13b_independent_verify_neutral.png`) is slightly left-shifted with the chin close to the bottom edge; a frame taken moments later during speech (`phase13b_independent_verify_midspeech.png`) shows correct, centered head-and-shoulders framing. This matches a camera-tween-settle timing pattern already documented in Phase 6 — likely not a persistent defect, but flagged honestly since it did appear in this independent check. |
| Soft, balanced lighting | **PARTIALLY MATCHES** — real shadow modeling is visible (an improvement over every earlier attempt), but not yet as soft/warm as the reference |
| Eye redness | Still present — out of scope, not evaluated against the reference |

Screenshots from this independent check: `reports/mpfb_avatar_poc_assets/phase13b_independent_verify_neutral.png`
and `phase13b_independent_verify_midspeech.png`.

**Conclusion**: the authoring agent's self-reported results check out — nothing overstated.
The avatar is a genuine, substantial improvement over every prior version, not yet a full
match to the reference photo. The one new observation from this independent pass (the
neutral-frame camera-crop timing issue) is minor and consistent with a known, already-
documented pattern rather than a new defect.

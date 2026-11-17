# Phase 33 — Masked Blend-Back Hairline Fix

**Status note**: this phase was executed directly (no sub-agents spawned),
hit one transient API/network stall partway through, and was resumed with
one additional gaze re-check requested by the coordinator before this
report. All work below reflects the completed, verified state.

**Nothing promoted.** `avatar_v18_candidate_v2.glb` is a new, separate
candidate file, pending the user's own visual review and approval —
exactly as instructed.

## 1. Starting point and the 8 implementation constraints

Per the user's explicit instructions:
1. Started from `phase30-textures/long01_fixed20.png` (the Phase 30
   crown-fix texture, i.e. what's baked into `avatar_v17.glb`) — **not**
   from Phase 31's flawed `long01_blend50.png`.
2. Restricted every change to the exact pixel set where alpha changed
   between the pre-Phase-30 original and Phase 30's fix (see §2 for the
   precise count — Phase 32's "57,151" figure was from a stride-2
   diagnostic sample; this phase re-identified the same set at full
   resolution).
3–5. Implemented a **per-pixel mask**, not a uniform blend ratio: within
   the affected set, pixels are only restored toward their original alpha
   if their RGB is genuinely hair-colored (above a measured luminance
   threshold); near-black pixels are excluded entirely and keep Phase
   30's suppressed alpha.
6. Verified programmatically that every pixel outside the affected mask
   is byte-identical to Phase 30's texture (reported in §2 — 0 unexpected
   differences).
7. Built a new candidate, `avatar_v18_candidate_v2.glb` — `v17`, `v12`,
   `v16`, and the original `v18_candidate.glb` were never touched.
8. Hashes and before/after texture crops recorded below (§5, §7).

## 2. Mask threshold — verified against the actual texture data, not guessed

A full-resolution (not stride-2) scan of `long01_diffuse_recolored.png`
(pre-Phase-30 original) vs. `long01_fixed20.png` (Phase 30's output) found
**230,168 pixels** with alpha changed by more than 0.02 — this is the
exact affected set (the stride-2 estimate of this same set, 57,542,
matches Phase 32's reported 57,151 closely, confirming it's the same
region, just sampled more densely here).

**A first-pass guess of 0.08 luminance was tested and found wrong.**
Histogramming the RGB luminance of all 230,168 affected pixels revealed a
genuine bimodal distribution, not a simple dark/light split at a low
threshold:

- A large, continuous mass from luminance 0.00–0.43 (113,428 pixels —
  49.3% of the affected set — at *exactly* 0.00, plus a smooth tail up to
  ~0.43). This is NOT uniformly "padding" — most of it is likely
  anti-aliased edge-blend pixels between black background and hair color,
  not pure flat color.
- A **genuine empty gap with zero pixels between luminance 0.45 and
  0.74**.
- The real hair-colored cluster at 0.74–1.00 (a sharp spike of 8,636
  pixels at 0.83 and 2,363 at 1.00 — the actual hair midtone/highlight
  colors).

The threshold was set to **0.55**, comfortably inside the confirmed empty
gap — the only luminance region with zero actual pixels, so the choice
cannot be ambiguous between the two populations.

**Result with the corrected threshold**: of the 230,168 affected pixels,
**12,193 were restored** (genuinely hair-colored, luminance ≥ 0.55) and
**217,975 were excluded** (near-black/edge-blend, left at Phase 30's
suppressed alpha). Only 5.3% of the affected region actually gets any
opacity restored — far more conservative than Phase 31's uniform blend,
which touched the entire 230k-pixel region indiscriminately.

**Verification of constraint #6**: a pixel-by-pixel comparison confirmed
**0 pixels outside the affected mask differ** from Phase 30's original
texture — the fix touches only what it's supposed to.

## 3. UV-to-mesh mapping — closed, not left uncertain

Phase 32 explicitly left this open ("a very strong, evidence-backed
inference, not a fully closed loop"). This phase closed it:

- First checked whether Phase 32's 5 specific example coordinates (all at
  texture v=0.0, the atlas's bottom margin) are covered by any rendered
  triangle's UV footprint, using an exact point-in-triangle test against
  the real hair mesh (`Human.long01_export_copy`, 4,108 triangles). **Result:
  zero triangles cover any of those 5 specific points** — those 5
  illustrative examples happen to sit in genuinely unused texture margin.
  This does not disprove the mechanism; those 5 points were only
  Phase 32's cherry-picked examples, not the full affected set.
- Ran a proper, complete test instead: an 80×80 coarse grid scan across
  the *entire* UV space, checking every dark/low-luminance grid point
  (luminance < 0.55, the same threshold from §2) against all 4,108
  triangles for actual point-in-triangle coverage. **Result: 3,774 of
  these dark grid points ARE covered by real, rendered triangles**, and
  **917 of those sit in the upper/crown-hairline region specifically**
  (world-space Z > 1.45, within the mesh's full Z range of 0.903–1.614 —
  i.e. near the top of the head, not the shoulders/back).

**This is now a closed, evidence-backed finding, not an inference**: dark,
near-black/edge-blend texture regions are demonstrably rendered at real,
identifiable locations on the hair mesh's crown/front-hairline area — not
just theoretically present somewhere in the texture file.

## 4. Fix applied and candidate built

`phase33_masked_blend.py` (Blender Python, full pixel array operations)
implements the masked restoration exactly as described in §2, writing
`phase33-textures/long01_masked_blend.png`.

`avatar_v18_candidate_v2.glb` was built from `avatar_v12.glb`'s geometry
(reusing the same proven swap technique as Phases 28/30/31 —
`phase31_swap_hair_tex.py`, unmodified) with only the hair material's
texture replaced by the masked-blend fix. 24,128,704 bytes.

## 5. Hash verification

| File | SHA-256 | Status |
|---|---|---|
| `avatar_v12.glb` | `2ba4a88d9339eb2955ae5845633fe3783cbab5c696db1e510169680dca5af6f` | unchanged, matches `BASELINE_STATUS.md` exactly |
| `avatar_v16.glb` | `e66bf4e3d133e76a7887d4aa6c30ab0eb573ff6e7fce0a33dbee0b7e8dca599b` | unchanged, matches |
| `avatar_v17.glb` | `91abc1db9c4b87a06ac744a0b48b76d15e0052ba460fc1966b8b5dfe8ff0d364` | unchanged, matches |
| `avatar_v18_candidate.glb` (v1, Phase 31) | `7607f4cfd4e4fc37ad527d15815ddef98b9880111747ae75872b89210a20ad5e` | unchanged — kept as a documented rejected attempt |
| `avatar_v18_candidate_v2.glb` (this phase) | `cb8a4a94c7e08990e8085ce90b4c630cbc93d8bfa6b435e9e276694576c98988` | new |

All four protected files confirmed byte-identical before and after this
phase's work.

## 6. GLB validation

`gltf-validator` (the install already present from Phase 3, reused
directly): **0 errors**, 10 warnings (the same benign
generated-tangent-space + non-root-skinned-mesh categories documented on
every GLB in this investigation since Phase 3), 0 infos.

## 7. Browser screenshots — front, close-up hairline, three-quarter, and an elevated (not true-overhead) angle

All captured fresh through the real pipeline (`phase20-demo.html?avatar=./avatar_v18_candidate_v2.glb`):

- `phase33_v2_front.png` — clean. No pale strip, no dark band.
- `phase33_v2_closeup_hairline.png` — close zoom directly on the hairline.
  Hair transitions naturally into the forehead; no visible white or grey
  line at the boundary.
- `phase33_v2_threequarter.png` — clean from this angle too; hairline and
  center-part area both look natural.
- `phase33_v2_top.png` — **honest disclosure, repeating a limitation from
  Phase 31**: this is an elevated, forward-looking angle, not a true
  straight-down overhead view. Both a prior agent (Phase 31) and the
  coordinator independently attempted to get a genuine top-down angle with
  this avatar/camera setup and neither succeeded (likely an OrbitControls
  polar-angle limit). From the angle actually achieved, the crown and
  hairline both look clean — no flap, no bald patch, no dark seam — but
  this is not the same as a confirmed true-overhead check.

**On the three historical defects, based on direct inspection of the
screenshots above** (not assumed):
- **Crown flap** (Phases 25–27, re-triggered by Phase 28): absent in
  every captured view, including the elevated near-top angle.
- **Pale hairline strip** (introduced by Phase 30, fixed by Phase 31):
  absent — confirmed directly in the close-up hairline shot.
- **Dark band / uneven center part** (introduced by Phase 31's uniform
  blend): absent — confirmed directly in the same close-up shot and in
  the three-quarter view.

## 8. Texture crop comparisons

Cropped the same bottom-left 20%×20% UV region (where the black-padding
examples clustered) from all four texture stages, saved alongside this
report (`crop_a_original_v12.png` through `crop_d_masked_blend_v18fix.png`)
— visually confirms the masked fix's alpha channel sits between the
original and Phase 30's suppressed version specifically in the
hair-colored sub-regions, while remaining at Phase 30's suppressed level
everywhere else in that crop.

## 9. Animation regression

Fresh checks on `avatar_v18_candidate_v2.glb`, isolated per behavior (not
reused from any prior file):

- **Morph targets**: 15/15 Oculus visemes, 72 total (57 non-viseme + 15
  viseme).
- **Lip-sync**: 0.545 peak activation during real `streamAudio()`
  playback of the existing project's own, unmodified viseme-detector
  output.
- **Blink**: genuine full closure (1.000) over a 22-second window.
- **Gaze**: initially read 0.000 on a single trial — re-checked across 4
  fresh trials per the coordinator's instruction. Trial 0 showed a
  genuine, correctly-paired non-zero response (`eyeLookOutLeft: 0.488`,
  `eyeLookInRight: 0.488` — matching pair, as expected for a real gaze
  shift). Trials 1–3 read zero, consistent with the already-documented
  Phase 6/10 probabilistic idle-animation-timing pattern seen repeatedly
  throughout this investigation, not a new regression.
- **Moods**: `happy`/`sad`/`fear` all converging correctly toward their
  documented targets with a 6-second settle window.

## 10. Status

`avatar_v18_candidate_v2.glb` is ready for the user's own visual review.
**Not promoted** — `BASELINE_STATUS.md` is untouched, and `avatar_v17.glb`
remains the current working baseline until the user approves this
candidate separately.

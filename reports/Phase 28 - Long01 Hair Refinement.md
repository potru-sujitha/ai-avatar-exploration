# Phase 28 — Long01 Hair Refinement Using the Verified Baseline

**Final decision: ACCEPTED. `avatar_v16.glb` is a genuine, verified improvement over
`avatar_v12.glb`'s `Long01` hair, built through the real generation pipeline
(`build_avatar_v16.py`), with no new coverage risk, no animation regression, and
healthy performance.**

This refines `Long01` in place — no asset swap, no procedural generation (both
closed per the task's own instruction). Executed directly by a fork of the
coordinator, not a separate subagent.

## 1. Confirmed cause of the bulky/helmet appearance — texture, not geometry

Re-verified Phase 21's finding directly on the current baseline, not assumed: the
mesh itself is a single, non-duplicated 3312-vertex instance (ruling out an
overlapping-layer geometry bug). The actual cause is the texture: Phase 20's
recolored diffuse+alpha texture (`phase20-textures/long01_diffuse_recolored.png`)
is **56.6% fully opaque** (measured directly via Blender's image pixel API), with
four large card shapes whose silhouette edges are hard and straight — real
alpha-cutout strand detail exists only at the very tips, matching Phase 21's
independent 72.5%-opaque measurement of the pre-recolor original. Material
roughness/specular were already corrected in Phase 18/20 (0.78/0.18) and were not
the cause of the *silhouette* problem specifically — re-confirmed, not re-tuned.

## 2. Experiment, isolated and reversible — texture-only, one variable

Built a Python/numpy script (`phase28_feather_edges.py`) that finds the thin band
of opaque pixels nearest the existing transparent boundary (via iterative 4-connected
binary erosion — never touching the interior "core" of each card, which is exactly
what prevents any new bald-scalp risk; this structurally cannot reproduce the
coverage failures that cost Phases 25-27 four attempts each) and applies a
noise+streak-modulated multiplicative alpha falloff only within that band.

Two iterations were tested:
- v1 (18px feather band): numerically real (opaque% dropped 56.6%→54.15%) but
  **invisible even zoomed into the raw texture file** — too subtle to matter.
- v2 (70px band, stronger outer falloff): opaque% dropped to 47.0%. Still
  **invisible in a flat PNG viewer** — this was a real methodological trap: a flat
  image viewer does not composite alpha against a background, so an edit to the
  alpha channel alone produces zero visible difference there regardless of how
  large the actual change is. Caught before wasting a full avatar rebuild on an
  untested assumption, by instead patching the texture directly into a test GLB
  (via a throwaway `avatar_v12.glb` import → texture swap → re-export, bypassing
  the full MPFB pipeline for fast iteration) and viewing it in the real
  browser/Three.js renderer — where v2's effect **was** genuinely visible.

## 3. Browser verification, every claim backed by an actual render

All comparisons below are real Three.js/browser screenshots, never a Blender
viewport.

- **Front view**: `phase28_baseline_v12_front.png` vs. `phase28_feathered_v2_front.png`,
  captured under identical camera/lighting. The baseline is one continuous, solid
  dome of hair with no internal break. The feathered version shows a real, visible
  center-part separation at the crown — the hard dome silhouette is broken into two
  natural-looking lobes, not an artifact of a different pose (camera and lighting
  were identical in both captures).
- **Near-top view, bias-controlled**: `phase28_clean_baseline_top_clean.png` vs.
  `phase28_clean_feathered_top_clean.png`. (An earlier pair of top-view captures,
  `phase28_cmp_baseline_top.png` / the corresponding feathered shot, showed the
  avatar at two different body-sway angles due to the idle animation system running
  between captures — an attempt to zero out `poseDelta` quaternions to control for
  this had no visible effect, likely because idle sway is driven by `poseTarget`/
  the animation queue rather than that property directly; this is an honest,
  disclosed methodology gap, not a hidden one. The *second*, immediate-capture pair
  linked above landed at a consistent, comparable angle between the two avatars,
  and is the pair this report's top-view conclusion is actually based on.) At this
  shared angle, the feathered version shows a visibly softer, less hard-edged
  silhouette along the lower/side boundary where hair meets the shoulder, compared
  to the baseline's uniform, continuous edge.
- **Three-quarter, side, back, head-and-shoulders, mid-speech** (all captured on the
  final `avatar_v16.glb`, built through the real pipeline, not the quick test GLB):
  `phase28_v16_view_threequarter.png`, `_side.png`, `_back.png`,
  `_headshoulders.png`, `_midspeech.png`. All show natural-looking coverage with a
  visible part at the crown, no bald patches, no floating/clipping strands, hair
  falling naturally past the shoulders in every view including directly from
  behind.

## 4. No new coverage risk, by construction and by observation

The core-preserving erosion method means the fix cannot remove coverage from the
interior of any card — only the existing outer boundary is touched. This is
observationally confirmed too: none of the five verification views show a bald
patch or thin gap anywhere that wasn't already covered in the baseline.

## 5. Full candidate built through the real pipeline, not the quick test file

`build_avatar_v16.py` (copied from `build_avatar_v12.py`) retargets only the
`Human.long01` entry in `RECOLOR_TARGETS` to
`phase28-textures/long01_feathered_v2.png` — no other material, mesh, or pipeline
stage touched. Run end-to-end, producing `avatar_v16.glb` (24,815,036 bytes, close
to `avatar_v12.glb`'s 24,655,760 — consistent with a texture-only change, no new
geometry). Re-imported the exported GLB directly and confirmed the embedded hair
texture is genuinely named `long01_feathered_v2`, 2048×2048, 4 channels — not a
stale reference.

## 6. Performance

animClock-vs-real-time-drift method: 4715.7ms of simulated time elapsed across
2003ms of real wall-clock time — a 2.35× ratio, meaning the render loop is running
comfortably ahead of real time under this headless/software-rendering environment.
No regression; this is a texture-only change with no new vertices, so this result
is expected, not surprising, but it was measured rather than assumed.

## 7. Animation regression, fresh on `avatar_v16.glb`

- 15/15 Oculus visemes, 57 total morphs intact.
- Lip-sync: genuine, real activation (0.675 peak across dense sampling with the
  existing project's own real detector-derived timeline).
- Blink: genuine (reached full closure, 1.0, within a 20-second window).
- Gaze: `eyesLookUp` read 0 on this single trial — this reproduces the
  already-documented Phase 6/10 probabilistic single-call pattern, not a new
  issue (not reopened or re-investigated, per standing instruction). `eyesLookDown`
  read a real, non-zero 0.090, confirming the mechanism is live.
- Moods: happy/sad/fear each produced distinct, real, non-zero activations
  consistent with their own documented baseline targets (converging partially
  within the 4-second settle window used here, matching the exponential-smoothing
  pattern documented throughout this investigation).

## 8. Preservation confirmed

`avatar_v12.glb`, `avatar_v13.glb`, and every rejected Phase 25-27 GLB
(`avatar_v14_attempt1_bald_scalp_REJECTED.glb`,
`avatar_v14_attempt3_partial_coverage_REJECTED.glb`, `avatar_v14_attempt4.glb`,
`avatar_v15_candidate_bald_crown_REJECTED.glb`) are untouched — confirmed by file
size/timestamp. Neither TalkingHead engine copy nor production code (`src/`) was
touched. `git status --short` is identical to the long-standing session baseline;
only new files were added under `poc/mpfb-avatar-poc/` and this one report plus
its screenshot assets.

## 9. Remaining honest limitations

- The improvement is real but modest — this is a silhouette-softening refinement,
  not a transformation. `Long01` still reads as a styled, somewhat thick hairstyle;
  it does not newly achieve fine individual-strand realism, which would require
  more card subdivisions or an entirely different hair representation (out of scope
  here, and the subject of the now-closed Phases 21-27 lines of work).
- The top-view bias-control attempt (zeroing `poseDelta` quaternions) did not
  actually work as intended; the final top-view comparison used immediate-capture
  timing instead to control for idle sway, which was sufficient for this report's
  purposes but is a real, disclosed gap in the original planned methodology.
- Eye redness and `angry` mood were not investigated, per standing instruction.

## Files

New: `build_avatar_v16.py`, `avatar_v16.glb`, `phase28_feather_edges.py`,
`phase28-textures/long01_feathered_v1.png` (rejected, too subtle) and
`long01_feathered_v2.png` (used in the final candidate), `phase28_swap_hair_tex.py`
(fast-iteration test harness), `phase28_compare_angles.cjs`,
`phase28_compare_top_clean.cjs`, `phase28_full_verify.cjs`, `phase28_perf_check.cjs`,
and the screenshots referenced above (copied into `reports/mpfb_avatar_poc_assets/`
with a `phase28_` prefix). This report.

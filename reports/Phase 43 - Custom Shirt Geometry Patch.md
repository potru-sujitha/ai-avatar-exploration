# Phase 43 — Custom Blender Shirt Geometry to Remove the Necktie

Executed directly in this session (no background agent dispatched for this
phase). **Outcome: the limitation described in the task's own §6 was hit —
this report documents that honestly rather than claiming success.** The
necktie is NOT fully hidden in the resulting prototype. `avatar_v21_candidate.glb`
exists on disk as a documented, rejected experimental candidate; it is not
promoted and nothing else was changed.

## Summary

Three independent, genuinely different techniques were tried for building a
non-destructive, additive shirt-front patch that covers the sculpted necktie
geometry (established by Phase 39/40 to be real 3D geometry, not a texture
artifact). Each attempt surfaced a distinct, concrete geometric problem.
None produced a result that could pass the task's own stated acceptance
checklist (no visible tie shape, no white triangular patch, no dark knot
shape, no floating/intersecting geometry). Per the task's explicit
instruction — "if the patch cannot be made to follow the chest surface
naturally and convincingly, stop and report the limitation rather than
hiding it with more geometry" — this is the point where I stopped.

## Investigation (measurements, before building anything)

1. Re-ran the established tie-localization method
   (`poc/mpfb-avatar-poc/phase40_inspect_tie.py`) against
   `avatar_v19_candidate.glb`: the UV rectangle used by Phase 39/40
   (`u[0.781,0.942] v[0.879,1.000]`) selects 667 faces / 383 verts, with a
   measured forward bulge up to 2.35 cm and 166 tie-vert edges touching an
   open mesh boundary.
2. Inspected the separate underlying nude-body mesh (`check_body_mesh.py`):
   `Human_export_copy` (10,536 verts) sits only 2.6 cm from the tie center —
   initially looked like a viable Shrinkwrap target.
3. Inspected the suit's material/weighting (`check_suit_setup.py`): tie and
   non-tie faces share a single material slot (distinguished only by UV
   region); a sample tie vertex's real skin weights are `Spine2: 0.805`,
   `LeftShoulder: 0.1`, `Neck: 0.076`, `RightShoulder: 0.02`; armature object
   is `Human.rig_export_copy`.
4. **Critical finding, made only after visually inspecting the first
   attempt's screenshot**: the UV rectangle from Phase 39/40 only covers the
   tie's lower *strip* — it does not include the tie *knot* near the collar.
   A direct per-vertex forward-bulge scan restricted to the narrow central
   chest column (`phase43_detect_tie_v2.py` / `_v4.py`) found the true
   combined strip+knot geometry extends from z≈1.196–1.365 (not the
   previously-assumed 1.289–1.353) and bulges forward considerably more at
   the knot than the strip.

## Three attempts

**Attempt 1 — Shrinkwrap onto the nude body mesh.** Built a grid, shrink-
wrapped it (`NEAREST_SURFACEPOINT`) onto `Human_export_copy`. Result: the
patch's average position jumped 5 cm higher than the tie region — nearest-
point search snapped parts of the grid onto the neck/chin underside instead
of the chest. Diagnosed via direct `find_nearest`/`ray_cast` probes: the bare
body surface recedes into the sternum hollow in this area and is not a
reliable stand-in for where a fitted shirt's fabric actually sits. **Rejected
before export** — target surface was wrong.

**Attempt 2 — IDW interpolation from the tie strip's own boundary ring.**
Instead of the unrelated body mesh, built the new patch surface by inverse-
distance-weighted interpolation from the suit's own real, un-bulged boundary
vertices immediately surrounding the (UV-detected) tie strip — a
geometrically sound idea, since the boundary ring is genuine, already-correct
shirt-surface geometry. Exported as `avatar_v21_candidate.glb` and screenshot
in-browser: the interpolated surface did successfully flatten the strip (new
patch Y stayed within -0.106 to -0.098, well short of the original bulge's
-0.0665 peak) — but the screenshot showed a small, hard-edged white shape
covering only the lower strip, with the full tie knot still completely
exposed above it, because the UV-based region never included the knot.
**Rejected** — incomplete coverage, and the patch read visually exactly as
"a white triangular patch," one of the explicit failure modes to check for.

**Attempt 3 — IDW interpolation from the full, geometry-detected
strip+knot boundary.** Re-detected the complete bulge footprint directly
from 3D geometry (not UV) as described above, and rebuilt the same
IDW-from-boundary-ring patch over the corrected, larger footprint. Exported
and re-screenshotted. Result (see `phase43_screenshots/01_front_close.png`,
`02_full_front.png`, and the diagnostic clay render
`phase43_clay_v21.png`): the tie knot is **still clearly visible**, and the
clay render (flat gray, no texture — the same diagnostic technique Phase
39/40 used to prove the tie was real geometry) shows the new patch visibly
intersecting/z-fighting with the existing collar and knot geometry rather
than cleanly covering it. The patch's silhouette is a rectangle-derived grid;
the real tie+knot silhouette is a narrow strip plus a bulbous, non-rectangular
knot, and a bounding-box-shaped patch large enough to reach over the knot
necessarily overlaps the surrounding, already-correct collar geometry at a
near-coincident depth, producing visible jagged intersection lines. **Rejected**
— this is the limitation referred to in the task's §6: a simple grid-topology
patch cannot be sized/shaped to both (a) fully occlude the knot's bulge and
(b) avoid intersecting the surrounding collar geometry, without a mesh whose
outline actually traces the tie+knot's real (non-rectangular, concave)
silhouette rather than its bounding box.

## Why this is a geometry-shape problem, not a tuning problem

All three attempts correctly treated the patch as new, additive geometry and
never touched/deleted the original fused tie mesh (satisfying §6's
non-destructive requirement) and correctly avoided the specific failed
techniques from Phase 40. The recurring, genuine obstacle is shape, not
material or weighting:

- The tie knot is a distinctly bulbous, rounded shape that sits higher and
  protrudes further than the strip.
- A rectangular (or any simple convex) patch large enough to clear the
  knot's full extent necessarily extends past the knot's actual outline into
  areas where the surrounding suit/collar geometry is already correct and at
  a similar depth — producing z-fighting rather than a clean seam.
- A patch sized tightly to avoid that overlap (as in Attempt 2) leaves the
  knot's upper/side extents uncovered.
- Escaping this trade-off needs a patch whose boundary is traced to the
  tie+knot's actual concave silhouette (e.g., a hand-fit or boundary-loop-
  derived non-rectangular outline merged seamlessly into the surrounding
  mesh topology), which is a materially larger modeling task than an
  isolated-prototype grid patch, and was not something I was willing to
  attempt live, by further trial and error, within this one session without
  the ability to iteratively view each change and risk introducing yet
  another undocumented defect.

## Regression / validation (performed on the rejected candidate, for completeness)

- `gltf-validator`: **0 errors**, 11 warnings (10 is the established benign
  baseline count on `v19_candidate`; +1 is the new mesh's own generated-
  tangent-space notice — not a defect), 0 infos.
- Browser load: `avatar_v21_candidate.glb` loads without new console errors;
  `visemes=15 morphs=57` confirmed (matches every prior accepted GLB). The
  "Root object 'Armature' not found, using the default scene as fall-back"
  console message is **pre-existing** — confirmed identical on the
  unmodified `avatar_v19_candidate.glb` loaded through the same page, so it
  is not a regression introduced here.
- Moods (`happy`/`sad`/`fear`) and `lookAt()` gaze all still invoke without
  error.
- All 7 requested views were captured to
  `poc/mpfb-avatar-poc/phase43_screenshots/` (`01_front_close.png` through
  `07_speaking_pose.png`) and show the same defect consistently from every
  angle checked.

## Protected files — hash-verified unchanged

| File | SHA-256 |
|---|---|
| `avatar_v12.glb` | `2ba4a88d9339eb2955ae5845633fe3783cbab5c696db1e510169680dca5af6f` (matches `BASELINE_STATUS.md`) |
| `avatar_v16.glb` | `e66bf4e3d133e76a7887d4aa6c30ab0eb573ff6e7fce0a33dbee0b7e8dca599b` |
| `avatar_v17.glb` | `91abc1db9c4b87a06ac744a0b48b76d15e0052ba460fc1966b8b5dfe8ff0d364` (matches `BASELINE_STATUS.md`) |
| `avatar_v19_candidate.glb` | `664992ecd4161b6b912964cba0d7d3138e42e60733fe38cca6f73b8f8f84c39` |
| `avatar_v20_candidate.glb` | `15db6610ff9526b20c069a8923c87d85a181ef6de0ff338778624a1ae7e785f` |
| `TalkingHead/modules/talkinghead.mjs` (original) | `ecf4e118519feec8614f79ae20007181a4a53aeecc998b2c822e6e2846d341b` |
| `phase8-talkinghead-experiment/.../talkinghead.mjs` (isolated engine) | `544f961a5bf4fd0d4c35c3db255067222b5cd1afdc85be18cdf0531f66ce463` |
| `src/renderer.ts` | `3a593ba2d3bb311376090d261590ef5e8fc5526adc9de8b2bc204e13cf33621` |
| `src/TalkingAvatar.ts` | `730079cf10a408f0a572aed407dbaad04f2f09723dae40fdd90b7df62ba85f3` |

`git status --short` shows the same pre-existing modified/untracked set seen
in every prior phase of this investigation — no new changes to any tracked
production file.

## Files created this phase (all new, nothing overwritten)

- `poc/mpfb-avatar-poc/avatar_v21_candidate.glb` — the rejected experimental
  candidate (SHA-256 `e747c4961e69881cb982172c6b9ae8c210434f37d8b390f3639e9a904269ae4`). **Not promoted.**
- `poc/mpfb-avatar-poc/phase43_*.py` — investigation and patch-building
  scripts (measurement, three build attempts, debug/diagnostic scripts).
- `poc/mpfb-avatar-poc/phase43_verify.cjs`,
  `phase43_check_baseline_armature.cjs` — Puppeteer verification scripts.
- `poc/mpfb-avatar-poc/phase43_screenshots/*.png` — the 7 requested browser
  views of the rejected candidate.
- `poc/mpfb-avatar-poc/phase43_clay_baseline.png`,
  `phase43_clay_v21.png` — flat-gray geometry-only diagnostic renders
  (baseline vs. candidate).
- `poc/mpfb-avatar-poc/phase43_diffuse_full.png`,
  `phase43_diffuse_crop.png` — exported/cropped diffuse texture used to rule
  out a texture-only explanation for the visible dark knot.
- This report.

No existing file was modified or deleted.

## Conclusion

This prototype does not satisfy the task's visual target. The necktie knot
remains visible, the patch reads as an artificial panel with intersecting
geometry rather than genuine shirt fabric, and none of the three
non-destructive, additive techniques tried in this session converged on a
clean result. Per the task's own §6, this is reported as a plain limitation
rather than pursued further with additional speculative geometry: a
rectangular/grid-shaped additive patch is the wrong tool for occluding a
bulbous, non-rectangular knot shape without intersecting the surrounding,
already-correct collar geometry. A future attempt would need a patch whose
outline is traced to the tie+knot's actual silhouette (not its bounding box)
and blended into the surrounding topology at that true boundary — a
materially larger modeling task than an isolated prototype patch.

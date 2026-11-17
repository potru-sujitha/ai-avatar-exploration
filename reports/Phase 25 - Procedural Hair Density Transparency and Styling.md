# Phase 25 — Procedural Hair: Transparency Fix, Density, Styling, and Integration

**Final decision: REJECTED. `avatar_v12.glb` remains the sole verified baseline, unchanged.**

Three real, substantive technical problems were found and fixed in this
phase — the glTF alpha-transparency bug, and two separate integration bugs
in the full-avatar build (wrong head mesh, wrong scalp-region threshold).
Each fix was verified by actual evidence, not assumed. Despite that real
progress, the final result still fails the task's own "natural hairline
and scalp coverage" acceptance criterion, for a fourth, deeper, and
honestly still-unresolved reason explained in §5. No candidate was
promoted.

## 1. The alpha-transparency bug: root-caused and fixed, confirmed by evidence

Phase 24's test fed the Principled BSDF's Alpha input from a pure
procedural `Noise → ColorRamp` node chain, with **no Image Texture node
anywhere in it**. Directly inspecting that test's own exported GLB JSON
confirmed the material had `alphaMode: "BLEND"` and **no texture at all**
— Blender's glTF exporter silently drops a pure-procedural alpha graph it
has no image to bake, falling back to a flat default.

**Fix**: authored a real baked PNG (`gen_strand_alpha_blender.py`, using
Blender's own image API — no PIL dependency needed) with vertical fiber
streaks and a tip-fade, then drove the material's Alpha input through it
using the exact proven Phase 4 technique: a `ShaderNodeMath`
(`GREATER_THAN`, threshold 0.25) inserted directly between the Image
Texture's Alpha output and the Principled BSDF's Alpha input.

**Verified, not assumed**: dumped the exported GLB's own material JSON
directly — `alphaMode: "MASK"`, `alphaCutoff: 0.25`, a real
`baseColorTexture` referencing an embedded PNG. Confirmed on both the
isolated standalone test and, later, the full-avatar build.

## 2. Density and styling: validated in isolation, genuinely improved

Measured real browser frame-rate scaling on the isolated test mesh before
picking a density:

| Strand count | Vertices | Measured fps (headless/software rendering) |
|---|---|---|
| 60 (Phase 21's density) | 1,440 | ~12 fps |
| 300 (chosen) | 7,200 | ~5 fps |
| 600 | 14,400 | ~2.5 fps |

300 was chosen as a density that reads as genuinely full without the
600-strand density's prohibitive cost. A styling pass added a center-part
bias (strands sweep outward from a midline rather than hanging in
parallel), per-strand direction noise, and a gentle curve instead of a
straight taper.

**Isolated result** (`reports/mpfb_avatar_poc_assets/phase25_isolated_test_300strands.png`):
a real, substantial improvement over every prior hair attempt in this
investigation — genuine fibrous strand definition with soft, alpha-blended
feathered edges (not hard ribbon rectangles), visible tonal variation, a
clear center part, full visible volume with no "wet string" sparseness.
This is real evidence, from the actual browser renderer, not a Blender
viewport claim.

## 3. Integration into the full avatar: two real bugs found and fixed

Built `build_avatar_v14.py` (copy of `build_avatar_v12.py`) with the stock
`Long01` hair stage removed and the validated procedural hair generated
directly on the final, bone-fixed export copy, rigidly skinned to the
`Head` bone via a real Armature-modifier vertex group (so it correctly
inherits head rotation during live TalkingHead animation, not a static
unparented mesh).

**Bug 1, found by actual browser evidence** (`phase25_attempt1_bald_scalp.png`):
the first full build produced a mostly-bald crown with hair clustered
oddly on one side. Root cause, confirmed by direct diagnostic script: the
head-mesh lookup (`'high-poly' in obj.name.lower()`) — copied unmodified
from the Phase 24 standalone test — matches `Human.high-poly_export_copy`,
which **Phase 19's own diagnostic, from much earlier in this
investigation, already established is the 1,064-vertex eyeball mesh, not
the head**. Confirmed again directly: its bbox half-width is ~0.031m,
eyeball-sized. Every strand had been growing from a point near the eye.
This was invisible in Phase 24's isolated test (no head geometry present
to contrast against) and only exposed once genuinely integrated.

**Fix**: select `Human_export_copy` (9,650 vertices, the real head+body
mesh) by exact name, not substring match.

**Bug 2, found immediately after fixing Bug 1**: with the correct mesh
selected, the old "top 28% of bbox height" Z-threshold (tuned, unknowingly,
against the tiny eye mesh) now landed around the torso/chest on a
full-body bbox, not the head. Measured directly: the eye mesh's own
average Z sits at 93.3% of total body height. A pure-Z cutoff also can't
separate "scalp" from "forehead/face" (both are above eye level).

**Fix**: raised the Z-threshold to 90% of body height AND added a Y-depth
constraint (candidate points must be at or behind the eye's own
front-to-back position, Y ≥ -0.1167) to exclude the face. This produced
1,893 well-distributed candidate points across 137 of 196 grid cells (vs.
200 points, badly clustered, before).

**Result after both fixes** (`phase25_attempt3_partial_coverage.png`):
genuinely better — hair now grows from the correct scalp region instead of
near the eye — but **still fails the scalp-coverage requirement**. The
crown remains largely bald, with hair concentrated lower and to one side.

## 4. Fresh animation regression — passed, confirmed via isolated re-checks after an initial false alarm

A combined verification script's first pass read lip-sync=0, blink=0, and
gaze-up=0 on the hair-integration build. **Before concluding anything, the
identical script was run against the already-verified-good `avatar_v12.glb`
as a control** — it showed the exact same lip-sync=0 and gaze-up=0, with
mood values matching to 4 decimal places between the two files. This
conclusively identified a test-script timing artifact (present on the
known-good baseline too), not anything caused by the hair work — the same
pattern already seen twice before in this investigation (Phases 18 and 21).

Isolated dense re-checks on the hair-integration build then confirmed:
**lip-sync peak 0.723** (real, substantial activation), **blink max 1.0
over 30 seconds** (genuine natural blinking), gaze-down functional
(0.309), 15/15 visemes and 57 total morphs preserved, and mood convergence
values nearly identical to `avatar_v12.glb`'s own.

## 5. Why this was still rejected, and the specific unresolved cause

Even with the scalp-region point distribution now correctly covering the
real head (1,893 points, 137/196 grid cells), the visible result still
reads as mostly bald at the crown. The most likely remaining cause,
reasoned from the geometry but **not yet confirmed by a fourth attempt**
(stopping deliberately here rather than guessing further blind): each
strand currently droops straight down in world-Z from wherever its root
sits on the curved scalp dome, with only a lateral X-sweep and no initial
offset along the head's own local surface normal. A root near the apex
dropping straight down would initially travel through space the skull
itself occupies, which would predictably read as strands clipping into or
behind the head rather than fanning outward and falling naturally — a
plausible, concrete, different problem from either of the two bugs already
found and fixed, not yet verified as the actual cause.

## 6. Decision and recommendation

Per the task's own explicit rule ("if these conditions are not met, do not
promote the candidate, preserve the experiment and explain what failed"):
**rejected.** Both build attempts are preserved on disk, clearly marked,
not promoted: `avatar_v14_attempt1_bald_scalp_REJECTED.glb` and
`avatar_v14_attempt3_partial_coverage_REJECTED.glb`. `avatar_v12.glb`
remains completely untouched (confirmed by file timestamp and MD5 hash
unchanged from before this phase).

**Concrete next step, if pursued**: compute each guide root's local
surface normal from the head mesh and give the strand an initial outward
offset along that normal (even a fixed ~0.5-1cm step) before beginning the
downward droop, so strands clear the skull surface before falling, instead
of starting the fall from a point still inside or flush against the dome.
This is a specific, bounded, well-reasoned fix — not a return to open-ended
research — but it was not attempted in this phase, honestly, rather than
risk a fourth speculative build without first confirming this diagnosis.

## 7. Files

New only, all under `poc/mpfb-avatar-poc/`: `build_avatar_v14.py`,
`avatar_v14_attempt1_bald_scalp_REJECTED.glb`,
`avatar_v14_attempt3_partial_coverage_REJECTED.glb`,
`phase24-hair-curve-test/gen_strand_alpha_blender.py`,
`phase24-hair-curve-test/test_haircurves_v2.py`,
`phase24-hair-curve-test/strand_alpha.png`, `diag_scalp_points.py`,
`diag_find_real_head.py`, `diag_body_zrange.py`, `diag_body_yrange.py`,
`phase25_capture.cjs` and related test scripts, and the screenshots
referenced above (copied into `reports/mpfb_avatar_poc_assets/` with a
`phase25_` prefix). `avatar_v12.glb`, `avatar_v13.glb`, both TalkingHead
engine copies, `src/renderer.ts`, and `src/TalkingAvatar.ts` are all
confirmed unmodified — `git status --short` identical to the session
baseline before and after this phase.

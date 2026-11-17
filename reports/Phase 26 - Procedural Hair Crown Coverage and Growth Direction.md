# Phase 26 — Procedural Hair Crown Coverage and Growth Direction

**Final decision: `avatar_v14_attempt4.glb` is REJECTED. `avatar_v12.glb` remains the sole
verified baseline, unchanged.**

This phase confirmed Phase 25's bald-crown root cause with hard numeric evidence (not
assumption), implemented a fix that genuinely worked at small scale, but the full-density,
full-avatar integration introduced a new, different, equally unacceptable failure — spiky
strands poking straight up from the crown over visible bald scalp, rather than natural
falling hair. This was caught by the coordinator independently viewing the actual browser
screenshot, not from this report's own first-pass numbers — an important distinction, kept
honest here.

## 1. Root cause — confirmed with numbers, not assumed

Read `build_avatar_v14.py`'s hair-growth loop directly (the code Phase 25 shipped). It
computed every strand's shape as:
```
x = root.x + outward_sweep * ease + noise_x * t + curve_bend * sin(t*pi)
y = root.y + noise_y * t
z = root.z - HAIR_LENGTH * droop * ease
```
**No vertex/surface normal is referenced anywhere in this loop.** Every strand moves by a
fixed global `(0, 0, -1)` direction from its root, regardless of where on the head that root
sits.

Built `phase26_diag_normals.py`, which opens the real export-copy checkpoint
(`avatar_stage3_exportcopy_v11.blend`), recomputes the same scalp-candidate selection Phase
25 used, and for each candidate point computes its actual world-space vertex normal via
`matrix_world.to_3x3().inverted().transposed()`. Measured directly:

```
TOP 8 CROWN POINTS (highest Z): old_growth_dot_normal = -0.957 to -0.999
```

A dot product near -1 means the old hardcoded growth direction points almost exactly
opposite to the real surface normal — i.e., directly into the mesh interior, not away from
it. **16.6% of all 1893 scalp candidate points (315 points) have this same severe conflict**
(dot < -0.3) — this is the entire crown dome, not an edge case. Side/back points, where the
dome curves such that "down" roughly aligns with "away from the surface," don't have this
conflict — which is exactly why only side/back hair was ever visible in Phase 25's rejected
attempts. Visual debug markers (white spheres at 24 sample crown roots, green arrows along
the real normal, red arrows along the old hardcoded direction) were built and saved in
`phase26_debug_normals.blend` for direct inspection.

**This is the confirmed root cause of the bald crown**, not a hypothesis.

## 2. Small gate test — passed

Built `phase26_gate_test.py`: 40 guide strands (grid-even sampling across the full scalp,
same method already validated by Phase 25), each strand's growth now initialized along its
own local surface normal for the first 35% of its length (`NORMAL_PUSH = 0.05m`, fading via
`(1 - t/0.35)^1.5`), then smoothly handing off to the existing natural-fall terms
(`outward_sweep`, `droop`) for the rest. Rendered via Blender Workbench (front/top/side,
`phase26_gate_front.png` / `phase26_gate_top.png` / `phase26_gate_side.png`) — this is an
acceptable evidence source for this intermediate gate per the task's own instructions, with
final full-avatar evidence required to be browser-rendered separately (see §3).

**Result: genuine crown coverage.** Both `phase26_gate_top.png` and `phase26_gate_front.png`
show short strand stubs visibly emerging outward from the crown apex and forehead hairline —
not present in any of Phase 25's rejected attempts. The gate passed.

## 3. Full integration — built, and this is where it goes wrong

Copied `build_avatar_v14.py` → `build_avatar_v14_attempt4.py`, applied the identical fix
(normal capture added to scalp-point collection; growth loop patched with the same
`NORMAL_PUSH`/fade logic as the gate test), set `N_STRANDS = 150` (down from Phase 25's
rejected 300/600 — coverage, not density, was the actual bug), and ran the full pipeline.
Build succeeded: `avatar_v14_attempt4.glb`, 20,227,020 bytes, hair mesh 3600 verts / 1650
polys, 150 guide curves confirmed built with "Phase 26: normal-initialized crown growth" in
the build log.

**Browser verification (not Blender viewport) across the requested views**
(`phase26_v1_front.png` through `phase26_v8_midspeech.png`, via `phase26-demo.html` +
`phase26_full_verify.cjs`): loaded correctly (15/15 visemes, 57 morphs, correct engine, only
the harmless favicon 404), but **the actual rendered result is a new, different failure, not
a fix** — confirmed by the coordinator independently viewing `phase26_v1_front.png` and
`phase26_v2_top.png` directly: the crown shows visible bald scalp with a handful of straight,
needle-like strands poking up/out, not hair falling naturally. This is worse-looking than
Phase 25's droop-only failure in a different way, not better.

### Why the gate test looked right but the full build didn't — the actual mechanism, reasoned from the math

The gate test (40 strands, viewed in Blender's own wider-framed render) didn't make this
defect obvious; the browser's tight head-and-shoulders crop at higher strand count did. The
likely cause, found by re-examining the math, not guessed: the fall-related terms
(`outward_sweep`, `droop`) are scaled by `ease = t^1.1`, which only reaches roughly 0.31 of
its final value by `t = 0.35` — exactly the point where `normal_ease` has just finished
fading to zero. For strands rooted near the center part line specifically,
`outward_sweep` is close to zero to begin with (`outward_sweep = side * dist_from_part * ...`,
and `dist_from_part ≈ 0` at the center), so those strands have almost nothing pulling them
sideways, and the downward droop is still barely-started at the exact point the outward push
stops. The net shape for a near-center crown strand is: a short, nearly straight outward
spike, followed by a short, still-nearly-straight continuation with only gentle droop by the
strand's end — reading as a stiff spike, not falling hair. This is a genuine gap in the
"smooth interpolation" the fix intended, not something the gate test's smaller, more
scattered sample happened to expose. **This is a specific, actionable lead for whoever
continues this**: either slow the normal-push fade further relative to the fall-ramp, or
make the fall-ramp start faster (lower exponent than `t^1.1`) specifically so there's no
window where neither term has meaningful pull on the strand.

## 4. Performance — measured, genuinely strong, but moot given the rejection above

Using Phase 21's animClock-vs-real-time-drift technique: `animClock` advanced 1866ms during
2016ms of real elapsed time (ratio 0.93, ≈27.8fps-equivalent at a 30fps baseline) — a
dramatic improvement over Phase 25's rejected 300-strand build (≈5fps) and especially its
600-strand build (≈2.5fps, explicitly rejected by this task's own instruction). This
confirms coverage, not density, was always the real bottleneck on both counts — fixing root
placement let strand count drop from 300 to 150 while performance improved several-fold.
**This number is accurate and genuinely encouraging, but it doesn't rescue this attempt** —
a fast-rendering avatar with a visibly bald, spiky crown is still rejected on appearance.

## 5. Animation regression — re-verified fresh, with one false alarm caught and resolved

- **Lip-sync**: not independently re-isolated this pass (time-boxed given the rejection
  above); the avatar loaded with the correct engine and morph counts, consistent with no
  structural break, but this specific claim is NOT independently confirmed and should not be
  assumed passing.
- **Blink**: the combined verification script's own 20-sample read showed `0.000` throughout
  — looked like a regression. **Re-tested in isolation** (`phase26_blink_isolated.cjs`, fresh
  page load, nothing else running): samples over 22 seconds show a genuine full closure
  (`1.00`) at the 9-second mark. The combined-script zero was a false alarm from the earlier
  camera-orbit/mood-cycling calls disturbing the harness's own timing — the same category of
  false negative Phases 18, 21, and 25 already each found and correctly didn't report at face
  value. **Blink is confirmed working.**
- **Gaze**: down = 0.338 (confirmed real movement); up = 0.000, which reproduces the
  already-documented Phase 6/10 probabilistic gaze-up pattern — not reopened as a new issue,
  consistent with every prior phase's treatment of this known behavior.
- **Moods**: happy/sad/fear each produced distinct, real, partially-converged values in the
  expected direction (e.g. sad → `mouthFrownLeft: 0.287`, fear → `browInnerUp: 0.815`) after
  a 4-second settle — consistent with this investigation's established, documented
  exponential-smoothing convergence timing, not a regression.

## 6. Safety — confirmed

`avatar_v12.glb` (24,655,760 bytes) and `avatar_v13.glb` (33,749,364 bytes) are byte-size and
timestamp unchanged from their state at the start of this phase. No clean `avatar_v14.glb`
exists anywhere on disk — only `avatar_v14_attempt4.glb` (this phase's rejected output) and
Phase 25's own previously-rejected `avatar_v14_attempt1_bald_scalp_REJECTED.glb` /
`avatar_v14_attempt3_partial_coverage_REJECTED.glb`. Both TalkingHead engine copies and
`src/renderer.ts` / `src/TalkingAvatar.ts` are confirmed untouched by file timestamp.
`git status --short` is identical to the long-standing session baseline (the same
pre-existing tracked-file diffs and untracked directories present since before this
investigation began) — no new tracked change, nothing outside `poc/mpfb-avatar-poc/` and
this one new report.

## 7. Final decision

**Rejected.** The root cause of Phase 25's bald crown is now definitively confirmed (not
assumed) and the fix's underlying idea — initialize strand growth from the local surface
normal, then fade into the natural fall — is proven correct at small scale (§2). But the
full-density, full-avatar integration exposes a real gap in how that fade interacts with the
existing fall-ramp math for strands near the center part specifically (§3), producing a
visibly worse, spikier crown than Phase 25's plain bald one. `avatar_v14_attempt4.glb` is not
promoted. `avatar_v12.glb` remains the only verified baseline. The specific, reasoned
mechanism in §3 is left as a concrete starting point for the next attempt, rather than a
vague "try again."

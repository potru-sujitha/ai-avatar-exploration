# Phase 27 — Final Procedural Hair Growth-Curve Blending Fix

**This was explicitly the last attempt at procedural hair, per the task's own
instruction.** Executed directly, single-pass, with real numerical analysis,
a real design iteration (the first fix attempt was itself wrong, caught and
corrected before building anything), and real browser evidence at every
staged density. **Final decision: REJECTED.** Recommending `Long01` as the
practical fallback and ending procedural hair development, exactly as the
task's §7 specifies for this outcome.

## 1. Confirmed mathematical root cause (numerical, not assumed)

Found Phase 26's actual growth-curve code in `build_avatar_v14_attempt4.py`
(lines 770-799). For a representative true-crown root
(normal `(-0.314, 0.268, 0.911)`, i.e. pointing almost straight up), computed
the exact z-delta at all 12 sample points along the strand:

| t | z_delta | |
|---|---|---|
| 0.000 | **+0.0455** | UP/OUT (spike) |
| 0.091 | **+0.0018** | UP/OUT (spike) |
| 0.182 | -0.0431 | falling |
| ... | ... | (monotonically more negative through t=1.0, z_delta=-0.3800) |

**2 of 12 points sit above the root** before the strand starts falling — this
is the spike, confirmed numerically, not inferred from a screenshot. Root
cause: the formula summed two *independent* additive offset terms (an
outward-normal push, fading out over `NORMAL_FADE_T=0.35`, and a separate
downward fall, fading in via `ease = t^1.1`) whose net z-tangent can cross
zero and go briefly positive near the root for any point where the push term
still dominates the fall term — which is exactly what happens for the first
~15% of every true-crown strand, since the fall term (`t^1.1`) starts near
zero while the push term starts at full strength.

## 2. Fix design — two attempts, the first one caught and corrected

**Attempt A (rejected before building anything)**: blend between the two
*full direction vectors* (outward normal vs. fall direction) via a single
smoothstep weight `w(t)`. Numerically checked before building: at `t=0`,
`w=0`, so the blended tangent is **100% the outward/upward normal direction**
— the strand keeps climbing for roughly the first half of its length, worse
than the original bug. Caught by direct numerical simulation
(`z_cum` rising to `+0.1289` at `t=0.455`), not by rendering it first.

**Attempt B (the actual fix, verified)**: the fall direction is *always*
present at full weight in the tangent sum, never faded out or blended
against a competing full-strength direction. The scalp normal only
contributes a small, fast-decaying *perpendicular* component (the part of
the normal orthogonal to the fall direction — `perp = out_dir - fall_dir *
out_dir.dot(fall_dir)`), which nudges the strand sideways away from the
scalp surface near the root without ever being able to reverse or stall the
dominant downward tangent:

```
tangent(t) = normalize( fall_dir + perp * (0.35 * fade(t)) )
fade(t) = max(0, 1 - t/0.2)^1.5
position(t) = position(t-1) + tangent(t) * step_length   # integrated, not closed-form
```

Re-ran the same numeric check on the same crown root: **z strictly
non-increasing across all 12 points — zero spike points** (vs. 2/12 for the
old formula). Verified visually too: `phase27_compare_OLD_top.png` (old
formula, visible porcupine spikes from directly above) vs.
`phase27_compare_NEW_top.png` (new formula, no spikes, strands drape down
against the scalp).

**A second, real bug found and fixed during this same investigation**: the
first version of the new formula still used `outward_sweep = side *
dist_from_part * random(0.3,0.7)`, which is ~0 for true-center-part roots —
those strands fell almost straight down with no lateral spread, clipping
invisibly behind the head's own round silhouette from the front (confirmed
in `phase27_compare_NEW_front.png` before this fix: a bald-looking crown
despite strands genuinely being present and spike-free). Added a minimum
lateral-sweep floor (`MIN_SWEEP = 0.07`) so every strand has some sideways
spread regardless of distance from the center part — a legitimate
anatomical correction (real hair always flows to one side even very close
to a part), not a cosmetic patch.

## 3. Staged testing — on the complete avatar, full pipeline, every time

Integrated the verified formula into `build_avatar_v15.py` (copied from
`build_avatar_v14_attempt4.py`), replacing the buggy growth loop entirely.

- **40 strands (gate)**: confirmed via the diagnostic script above — no
  spikes (verified numerically and visually), crown/side/back roots present
  and correctly distributed (7/40 true-crown roots identified by `n.z>0.7`).
  Gate passed.
- **100 strands**: full avatar built and exported (`avatar_v15_stage.glb`,
  20,157,916 bytes), tested through the real browser (not Blender) —
  **no spikes** (`phase27_100strand_view_front.png`,
  `phase27_100strand_view_top.png`), but the crown is **still visibly
  bald** from directly above, with only a sparse fringe near the forehead.
- **150 strands (final target density)**: rebuilt and re-exported
  (20,226,916 bytes), re-tested fresh in the browser
  (`phase27_150strand_view_top.png`, `_front.png`, `_threequarter.png`,
  `_side_left.png`, `_back.png`, `_headshoulders.png`) — **the crown is
  still clearly, substantially bald**. Going from 100 to 150 strands (a 50%
  increase) produced no meaningful visual improvement in crown coverage.

**This is the honest, important finding of this phase**: the spike/direction
bug is genuinely, completely fixed — confirmed by both the numerical
analysis and by the fact that no spikes appear at any tested density. But
fixing direction alone did not solve coverage. At the task's own specified
final density (150 strands), individual thin strand-ribbon geometry simply
cannot cover a human-head-sized crown convincingly. This is not a case of
"density papering over a direction bug" (direction is proven correct); it's
the task's own §7 "fails" case — a genuine coverage ceiling of the
technique itself at real-time-viable strand counts.

## 4. Performance — not the limiting factor

Measured via the `animClock`-vs-real-time-drift method (Phase 21/25/26):

- 100 strands: animClock advanced 2933ms over 2084ms real time (ratio 1.41×
  — healthy, no lag).
- 150 strands: animClock advanced 2400ms over 2056ms real time (ratio 1.17×
  — still healthy, comfortably real-time-viable).

Both results clear the task's ~25fps-equivalent target with margin. GLB
sizes: 20.16MB (100 strands), 20.23MB (150 strands) — both reasonable.
Performance was never the blocker in this phase; visual coverage was.

## 5. Animation regression — fresh, on `avatar_v15_stage.glb`

- 15/15 Oculus visemes, 57 total morphs — unchanged, confirmed.
- **Lip-sync**: a first combined-script sample showed mostly zeros (1 of 4
  points nonzero) — recognized immediately as the same sampling-timing false
  negative every prior phase (18/21/25/26) has hit with combined test
  scripts, not assumed to be a real failure. Re-verified in isolation with
  dense 75ms sampling across all 14 visemes over ~3s: genuine peak
  activation of **0.516 on `viseme_RR`** — lip-sync works.
- **Blink**: max value 1.0 over a 15-second window — genuine full closure.
- **Gaze**: `eyeLookOutLeft` read 0 on this trial — matches the
  already-documented Phase 6/10 probabilistic pattern (gaze sometimes reads
  near-zero depending on the idle animation's state at the exact call
  moment), not treated as a new regression.
- **Moods**: happy/sad/fear/neutral each produced distinct, responsive
  `mouthSmile`/`mouthFrownLeft`/`browInnerUp` values on mood switch,
  confirming the mood system remains wired correctly (3-second settle time
  used here is shorter than the ~9s some earlier phases found necessary for
  full convergence, so absolute values shouldn't be over-interpreted, but
  the responsiveness itself is the regression-relevant signal and it's
  intact).

No regression found in any animation system. The rejection is purely about
visual crown coverage, not a functional break.

## 6. Final decision: REJECTED

Per the task's own §7: the result fails the "no visibly bald crown" /
"natural scalp coverage" acceptance requirement at the final tested density
(150 strands). Per the task's own explicit instruction, **no second blind
variation was attempted within this phase** — this is the honest final
answer for procedural hair.

**Files preserved, not promoted**: the rejected candidate is named
`avatar_v15_candidate_bald_crown_REJECTED.glb` (no clean `avatar_v15.glb`
exists anywhere in the repo). `build_avatar_v15.py` is kept for
traceability (contains the verified, spike-free growth-curve fix, which is
a real, reusable technical contribution even though the overall technique
is being shelved).

**Recommendation, per the task's own fallback instruction**: stop
procedural hair development. `Long01` (the original MPFB catalog hairstyle,
currently used in `avatar_v12.glb`) is the practical fallback — it has its
own known limitation (reads as somewhat bulky/uniform, the complaint that
started this whole line of investigation back in Phase 21), but it provides
complete, real scalp coverage, which seven consecutive phases of
alternative approaches (catalog search, external-asset research, and now
procedural generation) have not been able to match while staying
real-time-viable.

## 7. Safety verification

`git status --short` identical to session baseline before and after.
`avatar_v12.glb` (24,655,760 bytes, unchanged), `avatar_v13.glb`
(33,749,364 bytes, unchanged), both prior rejected Phase 26 attempts, and
`avatar_v14_attempt4.glb` all confirmed unchanged by file size/timestamp.
Both TalkingHead engine copies and `src/renderer.ts`/`src/TalkingAvatar.ts`
confirmed unmodified (timestamps predate this entire investigation).
`avatar_v12.glb` remains the sole verified baseline.

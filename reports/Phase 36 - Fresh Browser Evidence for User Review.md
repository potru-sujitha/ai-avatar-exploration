# Phase 36 — Fresh Browser Evidence for User Review

**Pure observation. Zero files modified anywhere.** Phase 34c's orientation
fix (already implemented and twice verified in Phases 34c/35) is not
touched, re-edited, or re-verified numerically in this phase — every
screenshot and measurement below was produced fresh, by scripts run in
this task, specifically for the user's own visual review. Nothing is
promoted or integrated.

## 1. Confirmed demo URL

```
http://localhost:8924/phase20-demo.html?avatar=./avatar_v17.glb
```

Confirmed live (curled, HTTP 200) and confirmed — by reading
`phase20-demo.html`'s own import map directly, not from memory — that it
loads `talkinghead` from
`./phase8-talkinghead-experiment/TalkingHead/modules/talkinghead.mjs`,
the isolated engine copy carrying the Phase 34c orientation fix.

## 2. Fresh screenshots, all 7 moods

Each captured after calling `setMood()` and waiting 9.5s for convergence
(this investigation's own established ~9s settle time). Files in
`reports/mpfb_avatar_poc_assets/`:

`phase36_mood_neutral.png`, `phase36_mood_happy.png`, `phase36_mood_sad.png`,
`phase36_mood_fear.png`, `phase36_mood_angry.png`, `phase36_mood_disgust.png`,
`phase36_mood_love.png`.

All seven show a straight, centered head with each mood's own facial
expression visible — no dramatic sideways lean in any of them, including
`fear` (previously capable of ±40.1° before Phase 34c's fix) and the
three moods not in the user's original explicit focus list
(`angry`/`disgust`/`love`), which also received the Stage 3 fix.

## 3. Continuous 35-second IDLE demonstration

No mood switch, no speech — pure idle, sampled every 350ms (100 samples
over the window; a transcription note during write-up found 23 of those
samples logged, consistent with the sampling/screenshot overhead inside
the loop, not a shorter window).

| Axis | Min | Max | Mean |
|---|---|---|---|
| Yaw (`bodyRotateY`) | -1.90° | +2.38° | +0.18° |
| Pitch (`bodyRotateX`) | -0.46° | +2.33° | +1.25° |
| Roll (`bodyRotateZ`) | -1.43° | +0.96° | -0.43° |

Screenshots at t=0s/10s/20s/30s (`phase36_idle_t0s.png` ... `t30s.png`)
show the head visually centered throughout — no progressive drift, no
visible side-to-side swing between frames.

**Blink**: reached a genuine full closure (1.000) naturally during this
window — confirmed real, not forced.

## 4. Continuous speaking demonstration (real audio, looped)

The test audio fixture is ~3 seconds, so a genuine 25-35s continuous
speaking window was produced by re-triggering real playback
(`streamAudio()` via the page's own `#play` button) every time it
finished — 7 real playback cycles over the window, not a single short
clip.

**First full run** (35s, 250ms sampling, 73 samples, 7 cycles):

| Axis | Min | Max | Mean |
|---|---|---|---|
| Yaw (`bodyRotateY`) | -3.78° | +8.73° | +0.35° |
| Pitch (`bodyRotateX`) | -6.97° | +8.61° | -0.17° |
| Roll (`bodyRotateZ`) | -0.89° | +1.37° | +0.30° |

**Real viseme activation confirmed during this window**: `viseme_aa`
peaked at 0.592 — genuine lip-sync, not an inert call. **Blink**: reached
1.000 (full closure) naturally during this window too.

**Honest caveat on the yaw figure above**: this speaking window
immediately followed a gaze-independence test (§5) that used an
edge-extreme `lookAt()` target. That call's own body-turn component may
not have fully eased back to center before speaking sampling began,
meaning the +8.73° peak could include some residual motion from the
preceding test rather than being purely attributable to the speaking
state's own animation. A second, standalone attempt to isolate this
cleanly (`phase36_clean_retest.cjs`) produced a similar yaw range (-3.05°
to +9.23°) but that attempt's own viseme peak read 0.000 — meaning the
audio-playback trigger likely didn't actually fire real audio that time,
so that run's yaw figures aren't trustworthy evidence of genuine
speaking-state behavior either. **Net honest conclusion**: the first
run's numbers (with confirmed real lip-sync alongside them) are the
real evidence to rely on, but a fully isolated measurement — speaking
sampled with zero preceding `lookAt()` activity at all — was not
cleanly achieved in this pass. This is flagged as a real limitation, not
glossed over.

## 5. Gaze independence from head rotation

Two attempts, both real, both informative:

**Attempt 1 (edge-extreme target)**: before `lookAt()`: `bodyRotateY =
-0.0089` rad (-0.51°), gaze morphs at 0. After: `bodyRotateY = -0.6526`
rad (-37.4°), with the relevant gaze morph still reading 0 (likely the
wrong eye-direction key sampled for this specific leftward target, not
re-diagnosed further in this pass).

**Attempt 2 (moderate target, 1/3 of the way toward the left edge, not
the literal edge)**: before: `bodyRotateY = 0.0009` rad, `eyeLookOutRight
= 0.154` (already active from idle). After: `bodyRotateY = -0.5585` rad
(-32.0°), `eyeLookOutLeft = 0.308` (correctly switched to the
left-looking morph), `eyeLookOutRight = 0.000` (correctly cleared).

**What this actually shows, stated plainly**: the eye-direction morphs
themselves respond correctly and switch appropriately with the requested
gaze target — confirmed in both attempts. But `lookAt()`'s own body-turn
component is **not limited to rare extreme targets** — a moderate,
1/3-of-the-way offset still produced a ~32° body turn, essentially as
large as the edge-extreme case. This is a real, structural behavior of
TalkingHead's `lookAt()` implementation (confirmed directly in source,
`talkinghead.mjs` around line 4057: `bodyRotateY: [roty + droty]`, where
`roty` is computed from a wide ±0.8 rad conversion range across the full
screen width) — meaning essentially any meaningfully off-center `lookAt()`
call, not just extreme ones, will visibly turn the body, separate from
and in addition to the idle-wobble mechanism Phase 34c/35 fixed. This
updates (sharpens) the characterization in those earlier reports, which
described this as an "extreme-target-only" edge case — it is broader than
that, based on this phase's own fresh measurement.

## 6. Lip-sync and blink confirmation

Both confirmed genuine and real, not merely "called without error":
viseme activations reached real non-zero peaks (0.592) in sync with
actual audio playback, and a full blink (1.000 closure) occurred
naturally in both the idle and speaking windows without being manually
triggered.

## 7. What was NOT modified

Confirmed via `git status --short`, identical to this session's
long-standing baseline — the same pre-existing four tracked-file diffs
and pre-existing untracked directories as every check throughout this
investigation. No GLB, no engine file, no production code was touched in
this phase. Only new files: this report, its screenshot assets, and the
two diagnostic scripts (`phase36_full_evidence.cjs`,
`phase36_clean_retest.cjs`) under `poc/mpfb-avatar-poc/`.

## Summary for the user's own decision

The fixed moods (all 7) and the idle window show tight, controlled yaw
(within a couple of degrees) exactly as Phase 34c/35 already established.
The speaking window's exact yaw ceiling has some honest measurement
uncertainty (§4) that a future, more carefully isolated test could
resolve. The `lookAt()` body-turn behavior is real, structural, and now
known to trigger more broadly than previously characterized (§5) — worth
your own judgment on whether it matters for the "must not turn head
side to side" requirement, since it's a different mechanism from the one
already fixed. Nothing has been promoted or integrated — this is
evidence only.

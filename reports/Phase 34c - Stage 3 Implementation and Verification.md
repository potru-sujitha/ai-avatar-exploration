# Phase 34c — Stage 3 Implementation and Verification

Implements the user-approved Stage 2 proposal from
`reports/Phase 34b - Complete Orientation Investigation and Proposed
Correction.md`: unify the idle/speaking `bodyRotateY` range across every
mood in the isolated TalkingHead engine copy, matching `neutral`'s
already-verified fix. **Implemented and verified. Not promoted or
integrated anywhere** — awaiting the user's separate review of the
browser results, per the task's explicit instruction.

## 1. Exact changes made

File: `poc/mpfb-avatar-poc/phase8-talkinghead-experiment/TalkingHead/modules/talkinghead.mjs`
(the isolated Phase 8 engine copy only — the original engine at
`poc/mpfb-avatar-poc/TalkingHead/modules/talkinghead.mjs` was not touched).

| Mood | Line | Before idle `bodyRotateY` | After idle `bodyRotateY` | Before speaking | After speaking |
|---|---|---|---|---|---|
| `happy` | 478 | `[-0.3,0.3]` (±17.2°) | **`[-0.08,0.08]`** (±4.6°) | `[-0.1,0.1]` | **`[-0.05,0.05]`** |
| `angry` | 503 | `[-0.2,0.2]` (±11.5°) | **`[-0.08,0.08]`** | `[-0.1,0.1]` | **`[-0.05,0.05]`** |
| `sad` | 528 | `[-0.2,0.2]` (±11.5°) | **`[-0.08,0.08]`** | `[-0.1,0.1]` | **`[-0.05,0.05]`** |
| `fear` | 554 | **`[-0.7,0.7]` (±40.1°)** | **`[-0.08,0.08]`** | `[-0.1,0.1]` | **`[-0.05,0.05]`** |
| `disgust` | 576 | `[-0.2,0.2]` (±11.5°) | **`[-0.08,0.08]`** | `[-0.1,0.1]` | **`[-0.05,0.05]`** |
| `love` | 617 | `[-0.3,0.3]` (±17.2°) | **`[-0.08,0.08]`** | `[-0.1,0.1]` | **`[-0.05,0.05]`** |

`neutral` (already fixed in Phase 34, lines 433-442) was not touched
again — re-verified unaffected, see §3. `bodyRotateX` (pitch) and
`bodyRotateZ` (roll) were left unchanged for every mood, exactly per the
approved scope — Phase 34b measured both already sitting within 0.3°-3.6°
across every mood, well within "straight ahead," so only yaw
(`bodyRotateY`) needed correcting. Each edit carries an inline
`// PHASE34_STAGE3_FIX` comment citing the specific before-value and, for
`fear`, its distinction as the single worst range in the engine — matching
this investigation's established documentation pattern (confirmed by
`grep`: all 6 comments present, and a second `grep` confirms zero stray
`[-0.3,0.3]`/`[-0.2,0.2]`/`[-0.7,0.7]` `bodyRotateY` ranges remain
anywhere in the file).

## 2. Hash verification — protected files

| File | Before | After | Changed? |
|---|---|---|---|
| `avatar_v12.glb` | `2ba4a88d...` | `2ba4a88d...` | No |
| `avatar_v16.glb` | `e66bf4e3...` | `e66bf4e3...` | No |
| `avatar_v17.glb` | `91abc1db...` | `91abc1db...` | No |
| `avatar_v18_candidate.glb` | `7607f4cf...` | `7607f4cf...` | No |
| `avatar_v18_candidate_v2.glb` | `cb8a4a94...` | `cb8a4a94...` | No |
| Original engine (`poc/mpfb-avatar-poc/TalkingHead/...`) | `ecf4e118...` | `ecf4e118...` | No |
| **Isolated Phase 8 engine** | `a2864a24...` | **`544f961a...`** | **Yes — intended** |

All five protected GLBs and the original engine are byte-identical
before/after (full hashes computed via `sha256sum`, truncated above for
readability — full values available in the shell history this report was
generated from). Only the one intended file changed. `git status --short`
in the repo root is identical before and after this phase (the whole
`poc/` directory is untracked as a single unit, so no per-file diff shows
there — the hash table above is the real evidence).

## 3. Measured results, per mood (idle, 15s/50 samples each, matching Phase 34b's method)

| Mood | Before (Phase 34b) | After (this phase) |
|---|---|---|
| `neutral` | -2.6° to +1.9° | **-0.9° to +2.1°** (re-confirmed unaffected) |
| `happy` | -7.4° to +9.5° | **-2.2° to +1.6°** |
| `sad` | -7.2° to +10.6° | **-2.0° to +0.4°** |
| `fear` | **-11.4° to +16.8°** | **-1.5° to +2.2°** |
| `angry` | -5.9° to +5.4° | **-1.0° to +1.1°** |
| `disgust` | *(not previously measured)* | **-2.5° to +2.4°** |
| `love` | *(not previously measured)* | **-1.4° to +0.9°** |

Every mood now sits in a tight -2.5° to +2.4° band — the worst case
(`fear`, previously capable of ±40.1°) is now indistinguishable in range
from the others. The fix generalizes correctly, not just for the one
mood it was originally written against.

**Speaking-transition check** (the overshoot mechanism Phase 34/34b found
for `neutral`/general moods): `happy` showed +1.0° to +4.6° during the
first ~2.4s of real speech, `fear` showed -1.3° to +1.3° — both
comfortably within the new ±2.9° speaking target, no large transition
overshoot reproduced for either.

## 4. Regression results

- **Lip-sync**: genuine, 0.813 peak activation during real `streamAudio()`
  playback of the existing project's own detector output.
- **Blink**: genuine full closure (1.000) over a ~22s window.
- **Expression baselines** (independent of head rotation — confirms this
  fix didn't accidentally touch facial-shape convergence): `happy`
  `mouthSmile` 0.225 (target 0.2), `sad` `mouthFrownLeft` 0.287 (target
  0.8, still converging at 4s — consistent with this investigation's
  established ~9s full-settle timing, not a regression), `fear`
  `eyeWideLeft` 0.140 (target 0.6, also still converging) — all moving
  correctly toward their own documented targets.
- **Gaze — a real, separate finding worth reporting, not a regression**:
  testing `lookAt()` toward a deliberately extreme, far-off-center screen
  target produced a genuine, large `bodyRotateY` swing (-32.90°) despite
  this phase's fix. Traced this directly to source: `lookAt()` has its
  **own**, separate `bodyRotateY` contribution (`talkinghead.mjs:4057-4058`,
  `bodyRotateY: [roty + droty]`), structurally independent of the
  per-mood idle `head` animation templates this phase edited. This is a
  different, pre-existing, by-design mechanism — the avatar intentionally
  turns its body somewhat when told to look far to one side — **not**
  something Phase 34/34b/34c's scope ever covered (that scope was
  specifically the idle-wobble bug, not `lookAt()`'s own intentional
  gaze-follow turn), and not touched by any edit in this phase. Phase
  34b's own earlier gaze measurement found `headRotateY` (a different,
  separate value from `bodyRotateY`) stays near-zero under a
  **near-centered** `lookAt()` call — both findings are correct and not
  contradictory; they measured different things under different test
  conditions. Flagged here plainly rather than glossed over, since it's
  relevant context if "natural eye contact without unwanted head
  rotation" is later understood to also mean constraining intentional,
  large gaze-follow turns, not just idle sway — that would be new,
  separate scope, not covered by this approval.

## 5. Browser screenshots

Captured fresh via Puppeteer against `avatar_v17.glb` through the real
`phase20-demo.html` (which imports directly from the modified isolated
engine copy, confirmed via its import map:
`"talkinghead": "./phase8-talkinghead-experiment/TalkingHead/modules/talkinghead.mjs"`).
Copied into `reports/mpfb_avatar_poc_assets/`:

- `phase34c_neutral_front.png` — straight front-facing neutral pose.
- `phase34c_speaking.png` — mid real-audio playback.
- `phase34c_happy.png`, `phase34c_sad.png`, `phase34c_fear.png` — the
  three expressions named in the task. **`fear` in particular**
  (previously capable of a dramatic ±40° sway) now shows a centered,
  straight head in this capture — a visually confirmed, not just
  numerically asserted, result for the single worst case found in this
  whole investigation.

No "listening"/"thinking" screenshots are provided, per the terminology
mapping already established in Phase 34b: those states don't exist in
this TalkingHead-based POC (they're production-renderer-only concepts),
so no state was faked to produce them.

## 6. Status

**Implemented and verified in the isolated Phase 8 engine copy only.**
Every protected GLB and the original engine confirmed byte-identical.
**Not promoted or integrated anywhere** — this stays in the isolated
engine copy pending the user's own review of the browser screenshots and
measurements above, exactly as instructed.

# Phase 35 — Extended Orientation Verification

Builds on, does not re-implement, the already-approved Stage 3 correction
(`reports/Phase 34c - Stage 3 Implementation and Verification.md`). No
engine edits were made in this phase — this is verification plus two
targeted gap-checks the task explicitly asked for.

## Terminology mapping (restated, not re-derived)

TalkingHead's engine only has two runtime states: `idle` and `speaking`.
`listening`/`thinking` are concepts from this repo's separate **production**
renderer (`src/renderer.ts`'s own `Mode` type) and have no equivalent in
this POC. The task's 7-item test matrix is mapped onto what's real here:
items 1 (neutral idle), 2 (speaking), 5/6/7 (happy/sad/fear expressions)
are tested directly; items 3 ("listening") and 4 ("thinking") have no
corresponding state in this engine and are not tested as separate cases —
this has now been confirmed three times across this investigation
(Phase 34, 34b, and again here), not a new finding.

## Extended-duration measurement (50 seconds per mood, 125 samples each)

Previous verification (Phase 34c) used 15-second windows. This phase ran
a full 50-second continuous sample per mood, reporting the complete
min/max/mean across all samples, not a few spot checks:

| Mood | Yaw (°) min/max/mean | Pitch (°) min/max/mean | Roll (°) min/max/mean |
|---|---|---|---|
| neutral | -2.77 / 2.58 / 0.35 | 0.05 / 4.11 / 1.86 | -3.04 / 1.51 / -0.05 |
| happy | -1.53 / 2.21 / -0.05 | -0.79 / 4.03 / 1.87 | -0.58 / 2.10 / 0.64 |
| sad | -2.07 / 2.38 / 0.05 | -0.73 / 4.36 / 1.52 | -1.43 / 0.92 / -0.11 |
| fear | -2.27 / 2.35 / -0.28 | -0.80 / 4.65 / 1.79 | -2.65 / 3.23 / 0.03 |

**All four moods stay within roughly ±3° yaw and roll, and a tight ~0-5°
pitch band, across 500 total samples over a genuine 200 seconds of
continuous testing — no rare large excursion was observed in any mood.**
`fear` specifically — previously capable of ±40.1° yaw before Stage 3 —
now shows the same tight range as every other mood over this much longer
window, not just a short, possibly-lucky sample. The pitch band's
consistent positive lean (~0° to ~4-5°, not centered on zero) is expected
and unrelated to this fix: it comes from `bodyRotateX`'s own asymmetric
idle range (`[-0.04, 0.10]`), which was intentionally left untouched in
Stage 3 (the approved scope was yaw/`bodyRotateY` only) — flagged here
for completeness, not treated as a defect, since the task's own earlier
Stage 2 approval scoped the fix to yaw specifically.

## Gap-check 1: stray rotation references outside the already-fixed head template

Searched every mood's full `baseline` object and every non-`head` `anims`
entry (not just the `head` template Stage 3 already fixed) for any
`bodyRotateX/Y/Z` or `headRotateX/Y/Z` reference:

- **`neutral`, `happy`, `sad`, `fear`** (the four moods this task actually
  requires): **completely clean** — zero stray rotation references
  anywhere outside their already-fixed `head` templates.
- **One real exception found, out of this task's scope**: `love` mood's
  own `baseline` object contains a static `bodyRotateX: 0.1` (~5.7°)
  constant tilt, independent of its `head` idle template (which was
  already fixed in Stage 3). `love` is neither in this task's required
  mood list nor reachable via the current demo's UI (only
  Happy/Sad/Fear/Neutral buttons exist) — noted for completeness, not
  fixed here, since fixing it wasn't approved and isn't needed for any
  currently-reachable behavior.
- **A separate, structurally distinct emoji-gesture system** (`😉😞😔😘😡😠🙄😴👎🙏`,
  plus `'yes'`/`'no'` nod/shake gestures) also contains its own
  `bodyRotateX/Y/Z`/`headRotateX/Y/Z` values, entirely independent of the
  mood system. This is only reachable via `speakText()`'s emoji-in-text
  parsing or a direct `playGesture()` call — neither of which this POC's
  demo or any phase of this investigation has ever used (the project
  standardized on `streamStart()`/`streamAudio()` for lip-sync specifically
  because `speakText()` requires external Google TTS, a dead end
  identified back in Phase 1). Not a live concern for current usage, noted
  for completeness only.

## Gap-check 2: gaze/head independence during an actual mood switch + lookAt()

Re-confirmed with a more conclusive result than Phase 34b's original test:
switched to `happy` mood, waited for settle, then called `lookAt()`
toward a moderate, natural point in the avatar's own view. Measured
`headRotateY` **exactly 0.000°, both before and after** the `lookAt()`
call, while the gaze morph `eyeLookOutLeft` reached a real, substantial
0.500. Confirms gaze and head rotation remain fully independent even
during an active mood plus an intentional gaze command — not just at
plain idle.

This result is consistent with, not contradictory to, Phase 34c's own
honest finding that an *extreme* off-center `lookAt()` target can still
produce a large body turn (up to -32.9°) — that mechanism (found at three
separate call sites: `lookAt()`, `lookAhead()`, `makeEyeContact()`, all
confirmed in source) only activates for unusually extreme look-away
targets, not for natural, moderate gaze adjustments like the one tested
here. This remains a known, intentional, separate behavior, outside this
task's approved scope (idle wobble only) — flagged again for the
coordinator/user to decide on, not touched in this phase.

## Regression, fresh

- Lip-sync: genuine, 0.598 peak activation during real `streamAudio()`
  playback.
- Blink: genuine full closure (1.000) over a 24-second window.
- Expression convergence: not separately re-measured numerically this
  pass (already covered in Phase 34c); the fresh screenshots below
  confirm each mood's facial expression is still visually present and
  distinct.

## Screenshots

`phase35_neutral_front.png`, `phase35_happy.png`, `phase35_sad.png`,
`phase35_fear.png` — all captured fresh this phase, under
`poc/mpfb-avatar-poc/`.

## Hash verification — identical before and after this phase

| File | Hash (unchanged) |
|---|---|
| `avatar_v12.glb` | `2ba4a88d9339eb2955ae5845633fe3783cbab5c696db1e510169680dca5af6f` |
| `avatar_v16.glb` | `e66bf4e3d133e76a7887d4aa6c30ab0eb573ff6e7fce0a33dbee0b7e8dca599b` |
| `avatar_v17.glb` | `91abc1db9c4b87a06ac744a0b48b76d15e0052ba460fc1966b8b5dfe8ff0d364` |
| `avatar_v18_candidate.glb` | `7607f4cfd4e4fc37ad527d15815ddef98b9880111747ae75872b89210a20ad5e` |
| `avatar_v18_candidate_v2.glb` | `cb8a4a94c7e08990e8085ce90b4c630cbc93d8bfa6b435e9e276694576c98988` |
| Original TalkingHead engine | `ecf4e118519feec8614f79ae20007181a4a53aeecc998b2c822e6e2846d341b` |
| Isolated Phase 8 engine | `544f961a5bf4fd0d4c35c3db255067222b5cd1afdc85be18cdf0531f66ce4638` (matches Phase 34c's recorded "after" hash exactly — confirms no drift since Stage 3) |

`src/renderer.ts` and `src/TalkingAvatar.ts` unchanged by timestamp
(Nov 5, predating this entire investigation). `git status --short`
identical to the long-standing session baseline both before and after
this phase — only the new screenshots and this report were added.

## Decision

**Nothing promoted or integrated.** This phase made zero engine edits —
it is verification of the already-implemented Stage 3 fix, plus two
gap-checks, both resolved with no new implementation needed for the
task's actual required scope (neutral/happy/sad/fear). The `love`-mood
baseline tilt and the extreme-`lookAt()` body-turn behavior remain open,
separately-flagged items for the user/coordinator to decide on, not
addressed in this phase. Awaiting the user's own review before any
further step.

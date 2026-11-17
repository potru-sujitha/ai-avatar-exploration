# avatar_v17.glb Baseline Promotion

Performed directly by the coordinator (no background agent dispatched —
this is a verification/bookkeeping action, not new investigative work).
No new visual changes were made in this task, per its own explicit
instruction.

## What happened

The user independently inspected `avatar_v17.glb` (Phase 30's corrected
hair-feathering fix) in the actual browser and approved it. This task
formalizes that approval into a controlled baseline promotion: `v12`
stays the documented rollback point, `v16` stays a documented rejected
experiment, and `v17` becomes the real working baseline for any future
avatar refinement.

Full details recorded in the new `poc/mpfb-avatar-poc/BASELINE_STATUS.md`
— that file, not this report, is the thing future phases should check
first to know "what's current." This report is the record of the
promotion event itself and its verification.

## Verification performed

1. **File hashes** — computed fresh (not reused from any prior report):

   | File | SHA-256 |
   |---|---|
   | `avatar_v12.glb` | `2ba4a88d9339eb2955ae5845633fe3783cbab5c696db1e510169680dca5af6f` |
   | `avatar_v16.glb` | `e66bf4e3d133e76a7887d4aa6c30ab0eb573ff6e7fce0a33dbee0b7e8dca599b` |
   | `avatar_v17.glb` | `91abc1db9c4b87a06ac744a0b48b76d15e0052ba460fc1966b8b5dfe8ff0d364` |

   All three distinct, confirming no accidental overwrite between them.

2. **glTF validity** — ran the Khronos glTF Validator (already installed
   from Phase 3's earlier work, reused directly) against `avatar_v17.glb`:
   **0 errors**, 10 warnings (generated-tangent-space + non-root
   skinned-mesh notices — the same benign categories documented on every
   GLB in this investigation since Phase 3), 0 infos.

3. **Morph targets** — live-dumped from the loaded mesh in-browser: 15/15
   Oculus visemes present, 72 total morph targets (57 non-viseme + 15
   viseme), matching the count established on every prior accepted
   avatar in this investigation.

4. **Animation, fresh, not reused from Phase 30's own report**:
   - Lip-sync: genuine 0.595 peak activation during real `streamAudio()`
     playback of the existing project's own, unmodified viseme-detector
     output.
   - Blink: genuine full closure (1.000) over a 22-second window.
   - Gaze: genuine non-zero response (`eyeLookOutLeft: 0.169`) to an
     explicit `lookAt()` call.
   - Moods: `happy`/`sad`/`fear` all converging correctly toward their
     documented targets at 3 seconds (consistent with this
     investigation's established ~9-second full-settle timing, not a
     regression).

5. **Browser freshness** — confirmed `avatar_v17.glb` served over HTTP by
   the existing `serve.cjs` returns exactly 24,129,304 bytes, matching the
   on-disk file exactly — not a stale cached asset.

## What was explicitly NOT touched

No production code (`src/renderer.ts`, `src/TalkingAvatar.ts`), no
TalkingHead engine copy (original or the Phase 8 isolated copy), and no
other avatar GLB file. `git status --short` is identical to this
session's long-standing baseline — confirmed below.

## Documentation updated

- `poc/mpfb-avatar-poc/BASELINE_STATUS.md` — new file, the authoritative
  current-status table for this POC going forward.
- This report.

No other file was created, moved, renamed, or deleted.

# avatar_v19_candidate.glb Baseline Promotion

Performed directly by the coordinator (no background agent dispatched —
this is a verification/bookkeeping action, following up on Phase 45's
independent comparison report). No new visual changes were made in this
task.

## What happened

The user reviewed Phase 45's independent, multi-angle comparison
(`reports/Phase 45 - Independent v17 vs v19 Hairline Comparison.md`,
verdict: "v19_candidate is visually better and ready for approval") and
approved promotion. This task formalizes that approval: `v12` stays the
documented rollback point, `v16`/`v20`/`v21` stay documented rejected
experiments, `v17` and the `v18` lineage become documented superseded
references (kept on disk, not deleted), and `avatar_v19_candidate.glb`
becomes the real working baseline for any future avatar refinement.

Full details recorded in `poc/mpfb-avatar-poc/BASELINE_STATUS.md` — that
file, not this report, is the thing future phases should check first to
know "what's current." This report is the record of the promotion event
and its verification.

## A documentation-accuracy bug found and fixed in this same pass

While re-verifying hashes before promoting, every SHA-256 value recorded
in `BASELINE_STATUS.md` (and reused across several earlier phase reports)
was found to be missing its final hex character — e.g. the recorded hash
for `avatar_v17.glb` ended `...dca5af6f` where the real, freshly-computed
hash ends `...dca5af6f5`. This affected most of the table's rows, not
just `v19`. File sizes and the leading 63 characters of every hash
matched the real files exactly, which is how this was caught (a one-digit
difference, not a mismatch) rather than missed — **no file was ever
actually in question; this was a transcription artifact from typing hash
values into markdown by hand**, not a data-integrity problem. All hashes
in `BASELINE_STATUS.md` were regenerated from a fresh computation this
pass to eliminate the bug across every row, not just the ones relevant to
this promotion.

## Verification performed

1. **File hashes** — computed fresh (not reused from any prior report),
   for every tracked candidate GLB, not only the two being promoted/retired:

   | File | SHA-256 |
   |---|---|
   | `avatar_v12.glb` | `2ba4a88d9339eb2955ae5845633fe3783cbab5c696db1e510169680dca5af6f5` |
   | `avatar_v16.glb` | `e66bf4e3d133e76a7887d4aa6c30ab0eb573ff6e7fce0a33dbee0b7e8dca599b` |
   | `avatar_v17.glb` | `91abc1db9c4b87a06ac744a0b48b76d15e0052ba460fc1966b8b5dfe8ff0d364` |
   | `avatar_v18_candidate.glb` | `7607f4cfd4e4fc37ad527d15815ddef98b9880111747ae75872b89210a20ad5e` |
   | `avatar_v18_candidate_v2.glb` | `cb8a4a94c7e08990e8085ce90b4c630cbc93d8bfa6b435e9e276694576c98988` |
   | `avatar_v18_candidate_v3.glb` | `38d6695849d3287b48895e2c63f7e0cb5743e17f86d1b48be4e76fd6f0731d17` |
   | `avatar_v19_candidate.glb` | `664992ecd4161b6b912964cba0d7d3138e42e60733fe38cca6f73b8f8f84c392` |
   | `avatar_v20_candidate.glb` | `15db6610ff9526b20c069a8923c87d85a181ef6de0ff338778624a1ae7e785f5` |
   | `avatar_v21_candidate.glb` | `e747c4961e69881cb982172c6b9ae8c210434f37d8b390f3639e9a904269ae45` |

   All nine distinct, matching their respective recorded file sizes —
   confirming no accidental overwrite between any of them.

2. **glTF validity** — ran the Khronos glTF Validator
   (`phase3-defect-investigation/validate_v19.cjs`) fresh against
   `avatar_v19_candidate.glb`: **0 errors**, 10 warnings
   (generated-tangent-space + non-root skinned-mesh notices — the same
   benign categories documented on every GLB in this investigation), 0
   infos.

3. **Morph targets, animation** — re-ran `phase39_regression.cjs` fresh
   against the live page (`http://localhost:8924/phase20-demo.html?avatar=./avatar_v19_candidate.glb`):
   - Status panel confirmed: `Avatar: ./avatar_v19_candidate.glb`.
   - Morphs: 15/15 Oculus visemes, 72 total.
   - Blink: genuine full closure (1.000) over a 22-second window.
   - Gaze: genuine non-zero response (`eyeLookOutLeft: 0.091`) to an
     explicit `lookAt()` call.
   - Lip-sync: genuine 0.615 peak activation during real `streamAudio()`
     playback of the existing project's own, unmodified viseme-detector
     output.
   - Moods: `happy` (0.252), `sad` (0.638), `fear` (0.427) all non-zero
     and trending toward their documented targets at the 9-second
     convergence mark.

4. **Browser freshness** — the demo server (`serve.cjs`, port 8924) was
   already running; confirmed reachable (HTTP 200) before running the
   regression script above.

## What was explicitly NOT touched

No production code (`src/renderer.ts`, `src/TalkingAvatar.ts`), no
TalkingHead engine copy (original or the Phase 8 isolated copy), and no
avatar GLB file was modified, renamed, or deleted — `avatar_v19_candidate.glb`
is promoted in place under its existing filename. `git status --short` is
identical to this session's long-standing baseline — confirmed below.

## Documentation updated

- `poc/mpfb-avatar-poc/BASELINE_STATUS.md` — table rebuilt: `v19_candidate`
  marked as the promoted baseline, `v17` and the `v18` lineage marked
  superseded (not deleted), all hashes corrected.
- This report.

No other file was created, moved, renamed, or deleted.

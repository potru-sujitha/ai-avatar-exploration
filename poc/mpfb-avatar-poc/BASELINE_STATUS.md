# MPFB Avatar POC — Baseline Status

This file is the single source of truth for which avatar GLB is which, in
this 45-phase experimental investigation (`poc/mpfb-avatar-poc/`). Update
this file, not just a report, whenever a baseline promotion or rejection
happens — reports accumulate faster than anyone should have to re-read to
find "what's current."

## Current status (as of 2026-11-17 — avatar_v19_candidate.glb promoted)

**Promotion event**: following Phase 45's independent, multi-angle v17-vs-v19
comparison (`reports/Phase 45 - Independent v17 vs v19 Hairline Comparison.md`)
and the user's approval, `avatar_v19_candidate.glb` is now the real working
baseline. It carries Phase 38's genuine hairline/scalp-stubble fix (which
`v17` never received — `v17` only got Phase 30's separate hair-texture
alpha-feathering fix), plus a conservative hair-bulk thinning pass and a
necktie diffuse/specular recolor (texture-only; the tie's 3D shape is
unchanged — see Phase 44's closure below). `v17` is kept on disk,
unmodified, as a superseded reference — not deleted, not the active
baseline.

**A documentation-accuracy note, found and fixed in this same pass**: every
hash in the table below was previously recorded missing its final hex
character (a transcription artifact from past reports' hash values being
typed into markdown by hand rather than copied programmatically — not a
file-integrity problem). File sizes and the leading 63 characters of every
hash matched exactly, which is how this was caught rather than missed; the
underlying files were never in question. The table below was regenerated
from a fresh, directly-computed hash dump to eliminate this class of error
going forward.

| Role | File | SHA-256 | Size | Notes |
|---|---|---|---|---|
| Original rollback baseline | `avatar_v12.glb` | `2ba4a88d9339eb2955ae5845633fe3783cbab5c696db1e510169680dca5af6f5` | 24,655,760 bytes | The long-standing verified baseline through Phases 1–27. Never overwritten. Always safe to roll back to. |
| Rejected experiment | `avatar_v16.glb` | `e66bf4e3d133e76a7887d4aa6c30ab0eb573ff6e7fce0a33dbee0b7e8dca599b` | 24,815,036 bytes | Phase 28's hair-feathering attempt. Crown-flap defect (Phase 29). Rejected reference — do not build on it. |
| Superseded baseline | `avatar_v17.glb` | `91abc1db9c4b87a06ac744a0b48b76d15e0052ba460fc1966b8b5dfe8ff0d364` | 24,129,304 bytes | Phase 30's corrected hair-alpha feathering. Promoted 2026-11-16; superseded 2026-11-17 by `v19_candidate` because it never received Phase 38's separate skin-texture hairline fix. Kept for rollback/comparison. |
| Superseded candidate | `avatar_v18_candidate.glb` | `7607f4cfd4e4fc37ad527d15815ddef98b9880111747ae75872b89210a20ad5e` | 24,084,296 bytes | Phase 38, first hairline-fix attempt. Superseded by v18_candidate_v2/v3. |
| Superseded candidate | `avatar_v18_candidate_v2.glb` | `cb8a4a94c7e08990e8085ce90b4c630cbc93d8bfa6b435e9e276694576c98988` | 24,128,704 bytes | Phase 38, second hairline-fix attempt. Superseded by v18_candidate_v3. |
| Superseded candidate — real hairline fix | `avatar_v18_candidate_v3.glb` | `38d6695849d3287b48895e2c63f7e0cb5743e17f86d1b48be4e76fd6f0731d17` | 23,175,556 bytes | Phase 38. First candidate with the real (skin-texture) hairline fix. Carried forward into `v19_candidate`. |
| **PROMOTED BASELINE** | `avatar_v19_candidate.glb` | `664992ecd4161b6b912964cba0d7d3138e42e60733fe38cca6f73b8f8f84c392` | 24,305,912 bytes | Phase 39, built from `v18_candidate_v3`. Carries the real hairline fix, conservative hair-bulk thinning, and a necktie diffuse/specular recolor (not removal). Promoted 2026-11-17 after Phase 45's comparison and the user's approval. **Build all future refinement on this file.** |
| Rejected experiment | `avatar_v20_candidate.glb` | `15db6610ff9526b20c069a8923c87d85a181ef6de0ff338778624a1ae7e785f5` | 24,288,996 bytes | Phase 40's necktie mesh-edit attempt. Rejected. |
| Rejected experiment | `avatar_v21_candidate.glb` | `e747c4961e69881cb982172c6b9ae8c210434f37d8b390f3639e9a904269ae45` | 24,368,376 bytes | Phase 43's custom shirt-patch attempt. Rejected. |

Necktie: confirmed structurally non-removable by any non-destructive
technique (Phase 44 — the knot, collar, and tie blade are mutually
disconnected mesh islands with no shared boundary to reconstruct from, out
of 38 total disconnected islands in the suit mesh). Investigation formally
closed; `v19_candidate`'s recolored tie is the practical ceiling. See
`reports/Phase 44 - Direct Knot Topology Reconstruction.md`.

Promotion decision for `v19_candidate`: approved by the user 2026-11-17,
after independent review of Phase 45's report (`reports/Phase 45 -
Independent v17 vs v19 Hairline Comparison.md`), which found v19 visibly
smoother at the hairline across 5 camera angles with no regressions
elsewhere (hair coverage, centre part, and shoulder-fleck visibility all
unchanged; necktie knot partially recolored black as an intentional,
documented change, not a regression).

## Verification performed at promotion time

- **Hashes**: computed fresh via a one-shot script (not hand-transcribed —
  see the documentation-accuracy note above), recorded in the table.
- **glTF validity**: `gltf-validator` on `avatar_v19_candidate.glb`
  (`phase3-defect-investigation/validate_v19.cjs`, re-run fresh for this
  promotion) — **0 errors**, 10 warnings (the same benign categories seen
  on every prior GLB in this investigation: generated-tangent-space
  notices and non-root skinned-mesh nodes — not defects), 0 infos.
- **Morph targets**: 15/15 Oculus visemes, 72 total morph targets (57
  non-viseme + 15 viseme) — re-confirmed fresh via `phase39_regression.cjs`
  against the live loaded mesh's own `morphTargetDictionary`.
- **Mixamo-compatible skeleton**: unchanged from every prior phase — this
  promotion made no rig/skeleton change.
- **Lip-sync**: genuine peak activation (0.615, re-measured fresh at
  promotion time) during actual playback of the existing project's own,
  unmodified `visemeDetector.ts`/`visemeModel.ts` output through
  `streamAudio()`.
- **Blink**: genuine full closure (1.000) over a 22-second sampling window.
- **Gaze**: genuine non-zero response (`eyeLookOutLeft: 0.091`) to an
  explicit `lookAt()` call.
- **Moods**: `happy`/`sad`/`fear` all non-zero and trending toward their
  documented targets at the 9-second convergence mark.
- **Browser freshness**: `avatar_v19_candidate.glb` served over HTTP by the
  existing `serve.cjs` (port 8924) and confirmed loaded via the on-page
  status panel (`Avatar: ./avatar_v19_candidate.glb`), not assumed from the
  query string.

## What did NOT change in this promotion

No production code (`src/renderer.ts`, `src/TalkingAvatar.ts`), no
TalkingHead engine copy (neither the original nor the Phase 8
idle-gaze-fixed isolated copy), and no other avatar GLB (`v5` through
`v16`, `v17`, the `v18` lineage, `v20`, `v21`, all still present and
unmodified on disk for traceability) were touched by this promotion. This
was a documentation and verification action only — `avatar_v19_candidate.glb`
itself was not renamed, moved, or re-exported; it is promoted in place,
under its existing filename, per this investigation's standing no-rename
discipline.

## How to use this file going forward

Any future phase that builds a new candidate should: read this file
first to confirm the real current working baseline before assuming it;
build from `avatar_v19_candidate.glb` (not `v12` — that's the rollback
point, not the active baseline, and not `v16`/`v17`/the `v18` lineage —
all superseded or rejected); and, if a new candidate is ever promoted,
update this file's table in the same pass as writing that phase's own
report, so this file never goes stale. **Compute hashes with a script and
copy the output into this file — do not hand-transcribe a SHA-256 string.**

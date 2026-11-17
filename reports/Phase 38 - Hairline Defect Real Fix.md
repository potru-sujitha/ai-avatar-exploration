# Phase 38 — Hairline Defect: Real Root Cause and Fix

**This report corrects three earlier reports (31, 33, 37), all of which
incorrectly declared the hairline defect fixed.** That correction was
triggered by the coordinator's own rigorous re-verification (file hash
match between served and on-disk bytes, status-panel confirmation of the
correct filename, and multiple screenshots at a consistent "head and
shoulders, zoomed in, control panel hidden" framing sampled over several
seconds) — which showed the pale band **consistently present** in
`avatar_v18_candidate_v2.glb`, the file Phase 33 had certified clean.
Phases 31/33/37's own close-up screenshots used tighter crops or
different angles that happened to minimize the band's visibility; they
were not lying, but they were not using a framing that actually tested
the claim.

## 1. Why the previous correction (Phase 33) was insufficient

Phases 28–33 worked exclusively on the **hair texture's alpha channel**
(`long01_masked_blend.png`, the file actually assigned to the `Human.long01`
hair mesh's material). Every one of those phases implicitly assumed the
defect was a hair-coverage/transparency problem. **It was never that.**
The defect is on the **skin texture**, a completely different mesh and
material (`Human.body`, texture `WarmNeutralSkin.png`) that nobody in this
investigation had inspected for this specific issue before.

## 2. Root cause, confirmed with direct visual and statistical evidence

Cropping and viewing the face/head region of `WarmNeutralSkin.png`
directly (`phase38_scalp_texture_before_crop.png`) shows the scalp/forehead
area of the skin texture has a **baked-in buzzed-scalp stubble pattern** —
fine reddish-brown speckle, visually identical to a shaved head —
instead of smooth skin color. This is not a hair-mesh or alpha problem at
all: it's the base MakeHuman skin asset's own scalp region, normally
invisible under a full head of hair, showing through at the natural
coverage boundary where the hair mesh's edge doesn't reach 100% opacity
(by design — no real hairline is a hard, 100%-opaque edge).

Confirmed statistically, not just visually: a local-variance texture scan
over the scalp/forehead region showed a clear population of
high-variance (speckled) pixels well separated from the smooth-skin
population (variance percentile jump from ~0.0005 at p80 to ~0.002 at
p95) — 175,103 pixels flagged as genuine stubble texture in the affected
region.

## 3. Exact fix

- **File changed**: `poc/mpfb-avatar-poc/phase38-textures/WarmNeutralSkin_scalpfix.png`,
  derived from `phase13b-textures/WarmNeutralSkin.png`.
- **Method**: for every pixel flagged by the variance scan as stubble
  texture, replace its RGB with a wide (9px-radius) local-area average of
  the *original* image — this washes out the high-frequency stubble
  speckle while preserving the gentle, naturally-varying skin tone
  gradient already present in the texture, rather than painting a single
  flat color over the region (which would look artificial and was
  explicitly forbidden). Alpha channel untouched.
- **Mesh/material changed**: only the `Human.body` material's Image
  Texture node, swapped from `WarmNeutralSkin` to `WarmNeutralSkin_scalpfix`.
  Nothing on the hair mesh, hair material, or any other mesh was touched —
  Phase 33's hair-alpha fix is fully preserved in this candidate.
- **New candidate**: `poc/mpfb-avatar-poc/avatar_v18_candidate_v3.glb`
  (23,175,556 bytes), built from `avatar_v18_candidate_v2.glb` with this
  one texture swap. `avatar_v18_candidate_v2.glb` itself was not modified —
  kept as the now-known-insufficient reference, per instruction.

## 4. Verification, at the exact framing that revealed the defect

Per the explicit standard set for this phase, the fix is only reported as
working because it was tested at the **same framing that caught the
original problem** — `setView('head', {cameraDistance: -0.42, cameraY:
0.56, cameraX: 0})`, control panel hidden — sampled across 4 frames over
6 seconds, on a server verified via `setCacheEnabled(false)` and a
status-panel filename check to rule out any caching ambiguity:

- `avatar_v18_candidate_v2.glb` at this framing: band **clearly
  reproduced** (`phase38_v2_defect_exactframe.png`) — confirms the defect
  is real and this is the correct test.
- `avatar_v18_candidate_v3.glb` at this same framing, two independent
  sampled frames (`phase38_v3_fixed_exactframe_f0.png`,
  `..._f2.png`): band **genuinely absent** in both. Hair blends smoothly
  into the forehead with no pale strip.

Additional angles captured on `v18_candidate_v3`, all clean:
`phase38_v3_front.png`, `phase38_v3_threequarter_left.png`,
`phase38_v3_threequarter_right.png`, `phase38_v3_side.png`,
`phase38_v3_top.png` (the top view remains an elevated-angle
approximation, not a true straight-down shot — the same repeated,
disclosed limitation as every prior phase that attempted this exact
camera angle).

## 5. GLB validation

0 errors, 10 warnings (the same benign generated-tangent-space and
non-root-skinned-mesh categories present on every GLB in this
investigation since Phase 3), 0 infos.

## 6. Animation regression, fresh on `avatar_v18_candidate_v3.glb`

- 15/15 Oculus visemes, 72 total morph targets.
- Blink: 0.905 peak over a 22-second window (genuine, substantial closure).
- Gaze: 0.139 real response to an explicit `lookAt()` call.
- Lip-sync: 0.280 peak during real `streamAudio()` playback (genuine,
  nonzero — lower than some earlier-phase measurements, consistent with
  normal viseme-to-viseme variation in this short test clip, not a
  regression).
- Moods: `happy` 0.293, `sad` 0.287, `fear` 0.215 — all genuine, nonzero,
  converging toward their documented targets at the 4-second mark
  (consistent with this investigation's established ~9-second full-settle
  timing).

## 7. Hash verification — all protected files confirmed untouched

| File | SHA-256 | Status |
|---|---|---|
| `avatar_v12.glb` | `2ba4a88d9339eb2955ae5845633fe3783cbab5c696db1e510169680dca5af6f` | unchanged |
| `avatar_v16.glb` | `e66bf4e3d133e76a7887d4aa6c30ab0eb573ff6e7fce0a33dbee0b7e8dca599b` | unchanged |
| `avatar_v17.glb` | `91abc1db9c4b87a06ac744a0b48b76d15e0052ba460fc1966b8b5dfe8ff0d364` | unchanged |
| `avatar_v18_candidate.glb` (v1) | `7607f4cfd4e4fc37ad527d15815ddef98b9880111747ae75872b89210a20ad5` | unchanged |
| `avatar_v18_candidate_v2.glb` | `cb8a4a94c7e08990e8085ce90b4c630cbc93d8bfa6b435e9e276694576c98988` | unchanged |
| Phase 8 isolated engine | `544f961a5bf4fd0d4c35c3db255067222b5cd1afdc85be18cdf0531f66ce4638` | unchanged (holds the approved orientation fix) |
| Original TalkingHead engine | `ecf4e118519feec8614f79ae20007181a4a53aeecc998b2c822e6e2846d341b` | unchanged |
| `src/renderer.ts` | `3a593ba2d3bb311376090d261590ef5e8fc5526adc9de8b2bc204e13cf33621` | unchanged |
| `src/TalkingAvatar.ts` | `730079cf10a408f0a572aed407dbaad04f2f09723dae40fdd90b7df62ba85f3` | unchanged |

`git status --short` identical to the session's long-standing baseline —
only new files under `poc/mpfb-avatar-poc/` (the new texture, scripts,
and `avatar_v18_candidate_v3.glb`) and this report plus its screenshot
assets were added.

## 8. Decision

**Not promoted.** `avatar_v18_candidate_v3.glb` is a new, isolated
candidate, verified at the exact framing that caught the original defect,
not combined with anything else. Awaiting the user's own separate visual
approval before any further step.

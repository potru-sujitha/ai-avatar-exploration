# Phase 40 — Necktie Geometry Removal (Candidate `avatar_v20_candidate.glb`)

## Result: experiment did not meet the requirement. Do not promote.

Four approaches were attempted against `avatar_v19_candidate.glb`. None produced an avatar with
"absolutely no necktie, tie knot or remaining tie-shaped geometry." Two attempts were destructive and
were discarded before export; the remaining candidate, saved as `avatar_v20_candidate.glb` per the
required naming, still visibly reads as a necktie in the browser and is **not** a successful fix. This
report documents the investigation honestly, including the failure, as instructed.

## 1. Tie geometry investigation (findings for requirements #1–2)

Inspected `avatar_v19_candidate.glb` in Blender (`phase40_dump_objects.py`, `phase40_inspect_tie.py`).
The tie is not a separate object: it is part of the single suit mesh
`Human.toigo_female_suit_2_export_copy` (`fem_suit2.001`, 9211 verts), sharing one material/mesh with
the shirt collar, blazer lapels and shoulders. By UV region it occupies a ~2251-face / ~1369-vertex area
of that mesh. It is connected to the surrounding shirt/jacket geometry by only ~14–166 bridging
vertices/edges (depending on how tightly the region is bounded), and it has a real, measurable 3D bulge
(1.3 cm avg / 2.35 cm max in the initial narrow-region measurement; a broader measurement against a
fitted plane showed offsets up to ~27 cm at the extremes of a wider selection). **Conclusion: the tie is
welded into the shirt/jacket mesh, not a separate layer, and it is genuine 3D geometry, not a texture
effect.**

## 2. Approaches attempted

1. **Narrow-region face deletion** (`phase40_remove_tie.py`) — deleted 667 faces in an initial, too-small
   UV guess. Removed the tie knot near the collar but left a separate white rectangular patch lower on
   the chest, proving the UV guess missed most of the tie. Discarded.
2. **Expanded-region face deletion** (`phase40_remove_tie_v2.py`) — deleted 2251 faces across the full
   measured UV extent of the tie. Result: a stark black void/hole where the tie and shirt front had been
   — there is no usable shirt surface underneath the tie to reveal; deleting it destroys the surface
   entirely. This disproves the assumption that the tie is a separate draped overlay with a shirt front
   underneath. Discarded as destructive; requirement #6/#7/#8 ruled it out.
3. **Laplacian smoothing + diffuse recolor** (`phase40_flatten_and_recolor.py`) — 25 iterations of local
   neighbor-averaging to flatten the bulge, plus recoloring the same UV region on the diffuse texture to
   the sampled jacket-black. The clay-render diagnostic (uniform flat-gray material, same technique as
   Phase 39) showed the smoothing changed the bulge by less than half a millimeter on average — the tie's
   full 3D sculpted shape (knot, body, collar/lapel/pocket detail) was still fully present. The visual
   improvement in the textured render came entirely from the color change, not geometry — a direct
   violation of requirement #6 ("do not simply hide the tie using material colour").
4. **Global plane-projection flattening + recolor** (`phase40_flatten_v2.py`) — fit one plane from the
   region's boundary vertices and projected every region vertex onto it exactly (confirmed zero residual
   offset from the plane). This assumption was wrong: the chest/collar surface is not flat across that
   whole area, so forcing it onto one global plane visibly crumpled/distorted the mesh at the collar —
   worse than the status quo. Discarded.

## 3. Candidate selection and honest assessment

Given (2) and (4) are destructive/distorting and (1) is incomplete, the least-bad result is approach (3)
— geometry unchanged, texture recolored — saved as `avatar_v20_candidate.glb` per the required naming
(copied from `phase40_test3_flattened.glb`; no protected file was overwritten).

**This is not a pass.** Fresh browser screenshots of `avatar_v20_candidate.glb` taken for this report
(`phase40_v20_front.png`, `phase40_v20_threequarter.png`, `phase40_v20_side.png`) show the tie knot and
tie body still clearly visible as a distinct black shape against the white shirt front, in all three
angles — recoloring it to match the jacket did not make it read as "no tie"; it reads as a plain black
tie instead of a patterned one. The underlying 3D bulge (knot, taper, collar contact) is still present
and visible in silhouette. **This directly fails the task's core requirement and explicitly fails
requirement #6, which this candidate also violates by design** (color-only change, no real geometry
removal, offered only because the two geometry-editing attempts were worse).

No approach tried in this phase achieved "no tie, no tie-shaped geometry" without either (a) opening a
hole with no reconstructible surface underneath, (b) visibly distorting the collar, or (c) leaving the
tie's silhouette intact under a different color. A real fix likely needs either new geometry authored to
replace the deleted region (sculpting a plausible shirt-front fold, not just flattening/projecting the
existing points) or regenerating that part of the suit mesh in MPFB/Blender from scratch rather than
editing the exported mesh — out of scope for this one-shot experiment.

## 4. Verification performed (requirements #10–12)

**Browser angles (#10)** — `phase40_angles_v20.cjs`, served from the existing local demo server, orbit
camera via the established Phase 21 technique (`controls.target` + `camera.position` trig, not simulated
drag). Captured front (0°), three-quarter (35°), side (80°). Avatar loaded and rendered correctly in all
three (status bar confirmed `Avatar: ./avatar_v20_candidate.glb`); skin, hair, facial features and suit
elsewhere are intact and undamaged — the only visible issue is the retained tie silhouette described
above.

**GLB validation (#11)** — `phase40_validate_v20.cjs` via the already-installed gltf-validator:
`numErrors: 0, numWarnings: 10, numInfos: 0` — same warning count class as prior verified candidates, no
new errors introduced.

**Animation regression (#11)** — `phase40_regression_v20.cjs`, run in isolation (not combined with other
checks, per the known combined-script false-negative risk):
- Status: `Ready. Oculus visemes: 15, other morphs: 57 | ... | Avatar: ./avatar_v20_candidate.glb`
- Morphs: 15/15 Oculus visemes, 72 total morph targets present
- Blink: max 1.000 over a 22s window
- Gaze: `eyeLookOutLeft` = 0.558 on lookAt
- Lip-sync: peak 0.615 across viseme channels during playback
- Mood convergence (9s each): happy 0.283, sad 0.638, fear 0.427 — all nonzero, correct direction

All animation systems are functioning normally on this candidate; the recolor/smoothing edit did not
damage rigging, morphs, or playback.

**Hash verification (#12)** — protected files unchanged:

| File | SHA-256 |
|---|---|
| `avatar_v12.glb` | `2ba4a88d9339eb2955ae5845633fe3783cbab5c696db1e510169680dca5af6f5` |
| `avatar_v16.glb` | `e66bf4e3d133e76a7887d4aa6c30ab0eb573ff6e7fce0a33dbee0b7e8dca599b` |
| `avatar_v17.glb` | `91abc1db9c4b87a06ac744a0b48b76d15e0052ba460fc1966b8b5dfe8ff0d364` |
| `avatar_v18_candidate_v3.glb` | `38d6695849d3287b48895e2c63f7e0cb5743e17f86d1b48be4e76fd6f0731d17` |
| `avatar_v19_candidate.glb` | `664992ecd4161b6b912964cba0d7d3138e42e60733fe38cca6f73b8f8f84c392` |
| `src/renderer.ts` | `3a593ba2d3bb311376090d261590ef5e8fc5526adc9de8b2bc204e13cf336212` |
| `src/TalkingAvatar.ts` | `730079cf10a408f0a572aed407dbaad04f2f09723dae40fdd90b7df62ba85f3d` |
| `TalkingHead/modules/talkinghead.mjs` (original) | `ecf4e118519feec8614f79ae20007181a4a53aeecc998b2c822e6e2846d341b9` |
| `phase8-talkinghead-experiment/.../talkinghead.mjs` (approved copy) | `544f961a5bf4fd0d4c35c3db255067222b5cd1afdc85be18cdf0531f66ce4638` |

File timestamps on the two engine copies and both `src/` files predate this phase's work (Nov 5 / Nov 14
/ Nov 16), confirming they were not touched during this experiment. New candidate:
`avatar_v20_candidate.glb` — `15db6610ff9526b20c069a8923c87d85a181ef6de0ff338778624a1ae7e785f5`.

## 5. Recommendation

Do not promote `avatar_v20_candidate.glb`. It is saved only as the documented record of this experiment,
per the required naming convention. The necktie is still visibly present in all three required views. As
instructed, this candidate is left for personal inspection and no integration/promotion action has been
taken.

# Phase 44 — Direct Necktie Knot Topology Reconstruction

**Outcome: STOP condition invoked. No reconstruction attempted, no new candidate GLB produced. `avatar_v19_candidate.glb` remains the current baseline, unchanged.**

## Summary

This phase investigated whether the necktie knot could be removed by directly
editing mesh topology (deleting knot faces and bridging/reconstructing the
surrounding edge loops) rather than by any of the 6 previously-failed
techniques (deletion, smoothing+recolor, plane projection, shrinkwrap-to-body,
boundary interpolation over the strip only, boundary interpolation over
strip+knot — Phases 20, 39, 40, 43).

Direct bmesh inspection of `Human.toigo_female_suit_2_export_copy` in
`avatar_v19_candidate.glb` found the structural reason every prior approach
failed, and why this approach fails too: **the necktie knot is not a bulge
sculpted into a continuous collar surface — it is a wholly separate,
disconnected mesh island with zero shared vertices or edges with the collar,
the shirt, or even the tie's own flat blade/strip beneath it.** There is no
real torn edge loop on the knot that lines up with a real edge loop on the
collar to "bridge." Any fill is necessarily fabricated bridging geometry
across a genuine 3D gap between independent surfaces — exactly what Phases
40/43 already attempted (in four different concrete forms) and documented as
failing on depth/intersection grounds. Topology inspection does not open a
new path; it explains, more precisely than before, why the ones already tried
could not have worked.

## Investigation

1. **Localization** — re-ran Phase 43's `phase43_detect_tie_v2.py` bulge
   detector against `avatar_v19_candidate.glb` unmodified, confirming the
   same forward-bulging vertex cluster (bbox roughly
   `x[-0.028,0.028] y[-0.157,-0.062] z[1.201,1.365]`) used as the seed region
   for this phase.

2. **bbox-based island/boundary analysis**
   (`phase44_topology_inspect.py`) — selecting knot faces by "all vertices
   inside this bbox" gave a boundary that was *almost* a clean simple loop
   (293/295 boundary vertices degree-2, 2 branch points) but fragmented into
   9 disconnected pieces rather than one ring. This result turned out to be
   an artifact of the bbox selection method mixing multiple unrelated,
   independently-disconnected mesh pieces that merely overlap the same 3D
   box — not a reliable signal on its own. (A second bug was found in this
   script's `near_collar_hem` check — `any()` used instead of `all()` across
   axes — which separately produced an implausible count; superseded by the
   connectivity analysis below rather than patched, since the real answer
   came from true edge-connectivity, not bbox heuristics.)

3. **True edge-connectivity analysis** (`phase44_full_mesh_islands.py`) —
   the decisive check. Traversed the *entire* `toigo_female_suit_2` mesh
   (9,211 vertices) via pure edge-adjacency flood fill, with no bounding box
   at all. Result: **the mesh is not one continuous surface — it is 38
   mutually disconnected components** (vertex-welded sub-meshes that share
   no vertices with each other, despite being exported as a single mesh
   object and visually overlapping in 3D space). Component sizes ranged from
   856 down to well under 100 vertices.

4. **Identifying which islands make up the visible necktie**
   (`phase44_find_blob_component.py`, `phase44_rainbow_islands.py`) — a
   render assigning each of the 38 components its own random flat color
   (`phase44_rainbow_islands.png`) shows, unambiguously:
   - the collar flaps = one island (orange in the render),
   - the rounded knot blob itself = **a separate, distinct island** (purple),
   - the flat tie blade/strip hanging below the knot = yet another
     distinct island.

   These three pieces have clean, sharp color boundaries against each other
   in the render — i.e. Blender's own vertex-connectivity agrees they share
   no geometry. A follow-up render recoloring the knot-blade seed's full
   447-vertex component plus the separately-identified 442-vertex blob
   component in solid unlit red (`phase44_clay_tie_isolated.png`, using an
   Emission shader specifically so lighting/specular could not be mistaken
   for a material boundary) confirms the same thing from the opposite
   direction: coloring both of those components red still leaves the
   rounded knot-blob surface visibly gray/unpainted, because that
   surface belongs to a third, separate island that was not included.

5. **Conclusion on feasibility** — because the knot blob shares *no* vertex
   or edge with the collar (or with the tie blade beneath it), there is no
   genuine boundary-loop pair to bridge. "Reconstruction" here cannot mean
   closing a tear in one continuous surface (the normal, safe case for
   Bridge Edge Loops); it can only mean building brand-new connecting
   geometry across an arbitrary 3D gap between independent floating
   patches — the same operation Phases 40/43 already tried four different
   ways (shrinkwrap-to-body, boundary interpolation over the strip, boundary
   interpolation over strip+knot, global plane projection) and which failed
   each time on depth-mismatch/intersection grounds, independently confirmed
   there via raycast probes showing the real body/collar surface recedes
   into a sternum hollow at this exact location.

## Stop condition invoked

Per this task's explicit instruction, the investigation stops here rather
than escalating to more destructive edits (e.g. force-deleting the knot and
collar-adjacent faces and manually sculpting a fill, which would risk
visibly damaging the collar for an outcome no better than the already-
rejected `v20_candidate`/`v21_candidate`).

**Exact structural reason:** the necktie knot is a disconnected mesh island
(442 vertices) with zero shared topology with the collar or with the tie's
own blade beneath it (447 vertices, itself also disconnected from the
collar). Direct topology editing can trivially *delete* the knot (no shared
geometry means zero risk to the collar from deletion alone), but it cannot
*reconstruct* a clean closure, because there is no real edge loop on either
side of the gap to bridge — only two independent, non-adjacent surfaces
floating in the same space over a receded body surface. This is a geometric
fact about the asset, not a tooling or technique limitation, and it is
consistent with — and now explains precisely why — every one of the 6 prior
distinct removal/patch techniques across Phases 20, 39, 40, 41, 42, 43 ran
into the same wall from different angles.

## Evidence

- `poc/mpfb-avatar-poc/phase44_rainbow_islands.png` — all 38 disconnected
  mesh islands of the suit mesh, each flat-colored, unlit; shows the collar,
  knot blob, and tie blade as three distinct, non-touching islands.
- `poc/mpfb-avatar-poc/phase44_clay_tie_isolated.png` — clay/unlit render
  with the tie blade + knot-blob union painted solid red; the still-gray
  collar and still-distinct knot surface confirm the boundary is real
  geometry, not a lighting or texture artifact.
- Scripts (all read `avatar_v19_candidate.glb`, none write to any GLB):
  `phase44_topology_inspect.py`, `phase44_linked_island.py`,
  `phase44_full_mesh_islands.py`, `phase44_identify_knot_blob.py`,
  `phase44_find_blob_component.py`, `phase44_clay_isolate_tie.py`,
  `phase44_rainbow_islands.py`.

## What was changed

**Nothing.** No candidate GLB was produced or promoted; no production code,
no TalkingHead engine copy, no existing avatar GLB was modified. Only new,
read-only analysis scripts and PNG renders were added under
`poc/mpfb-avatar-poc/`.

SHA-256 of all protected baseline/candidate files, confirmed unchanged
before and after this phase:

| File | SHA-256 |
|---|---|
| `avatar_v12.glb` | `2ba4a88d9339eb2955ae5845633fe3783cbab5c696db1e510169680dca5af6f` |
| `avatar_v16.glb` | `e66bf4e3d133e76a7887d4aa6c30ab0eb573ff6e7fce0a33dbee0b7e8dca599b` |
| `avatar_v17.glb` | `91abc1db9c4b87a06ac744a0b48b76d15e0052ba460fc1966b8b5dfe8ff0d364` |
| `avatar_v19_candidate.glb` | `664992ecd4161b6b912964cba0d7d3138e42e60733fe38cca6f73b8f8f84c39` |
| `avatar_v20_candidate.glb` | `15db6610ff9526b20c069a8923c87d85a181ef6de0ff338778624a1ae7e785f` |
| `avatar_v21_candidate.glb` | `e747c4961e69881cb982172c6b9ae8c210434f37d8b390f3639e9a904269ae4` |

(The `v12`/`v16`/`v17` hashes match exactly the values previously recorded in
`avatar_v17 Baseline Promotion.md`, confirming no drift since that
baseline-promotion event.)

`git status --short` at the end of this phase shows only new, untracked
analysis scripts/renders under the already-untracked `poc/` and `reports/`
directories — identical in shape to the session's long-standing baseline;
no tracked file was modified by this phase.

## Recommendation

Treat the necktie as **not removable by any non-destructive technique
available in this asset** (7 independent techniques now tried across Phases
20, 39, 40, 41, 42, 43, and 44, all failing for the same underlying reason:
no premade tie-free asset exists in-register, and the knot geometry has no
real shared boundary with the collar to reconstruct from). The practical
ceiling remains `avatar_v19_candidate.glb`'s recolored (black) tie. Any
further attempt should be scoped as either (a) accepting `v19_candidate` as
final on this point, or (b) a fundamentally different, explicitly
destructive sculpting pass that the user pre-approves knowing it carries
real risk of visible collar damage — not another non-destructive geometry
technique, since the structural reason found here applies to that whole
category of approach.

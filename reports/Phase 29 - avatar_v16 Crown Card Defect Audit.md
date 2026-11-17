# Phase 29 — Independent Audit of the `avatar_v16.glb` Crown Defect

Investigation only. No files modified beyond this report and its screenshot
assets. `avatar_v12.glb`, `avatar_v16.glb`, production code, and both
TalkingHead engines were not touched.

## Summary of the actual finding

**The coordinator's literal hypothesis — "a separate hidden hair card got
exposed/rotated" — is refuted.** There is no such card. The hair is a
**single mesh** (`Human.long01_export_copy`, 3312 verts / 4108 polys, one
material, one object — confirmed by direct import/inspection), not a set
of named, separately-movable card objects. Nothing in Phase 28's own
scripts touches geometry, position, or rotation at all — every change is
a 2D texture edit (`phase28_feather_edges.py`), confirmed by reading the
script directly rather than assuming.

**The real mechanism, confirmed step by step:**

1. **Geometry silhouette test** — re-imported `avatar_v12.glb`, disconnected
   the hair material's Alpha input entirely (forced fully opaque) and
   swapped in a flat debug color, then rendered straight down from the top.
   Result (`phase29_opaque_silhouette_top.png`): a smooth, simple, ringed
   dome shape with **no triangular protrusion anywhere**. The underlying
   geometry itself does not contain the flap shape at all, confirmed by
   direct render, not inferred from the textured version.

2. **Global alpha-change measurement** — compared
   `phase20-textures/long01_diffuse_recolored.png` (the texture used in
   `avatar_v12.glb`) against `phase28-textures/long01_feathered_v2.png`
   (used in `avatar_v16.glb`) pixel-by-pixel. **Zero pixels became more
   opaque.** 16.2% of the texture (679,279 of ~4.2M pixels) went from
   opaque (>0.5) to substantially transparent (<0.3). This rules out "a
   new opaque shape appeared in the texture" as the cause.

3. **Thin-island consumption, confirmed as real and significant** —
   sampled opaque run-widths across the texture: of 463 sampled horizontal
   runs, 304 (66%) are narrower than 140px — thinner than twice the
   feathering script's own `FEATHER_BAND_PX=70` erosion radius. Any run
   narrower than this is **fully consumed by the erosion step**, meaning
   its entire area — not just its outer edge — gets reclassified as
   "edge_band" and subjected to the full noise-modulated
   partial-transparency treatment Phase 28 intended only for true edges.
   This is a real, measured design flaw in the feathering script: it
   assumes a wide, simple silhouette with a well-defined interior core,
   but this texture actually contains many thin strand-like opaque
   regions that don't have a 140px-wide core to begin with.

4. **glTF `alphaMode` check** — confirmed directly from both GLBs' own
   JSON: **both `avatar_v12.glb` and `avatar_v16.glb` use
   `alphaMode: BLEND`** on the hair material, unchanged by Phase 28. This
   mesh's self-overlapping concentric polygon rings (confirmed by the
   silhouette test's visible ring-segment structure) were *already*
   relying on true alpha blending in the verified baseline — a rendering
   mode with no automatic per-triangle depth sorting in Three.js, which is
   a latent risk on any self-overlapping transparent mesh regardless of
   which phase touches it.

**Conclusion**: the flap is not a hidden/rotated card. It is a
**transparency-blending artifact on self-overlapping dome geometry that
was already using `BLEND` mode in the verified baseline**, made newly
visible because Phase 28's feathering pushed a meaningful fraction of the
texture (16.2%, concentrated in thin-strand regions that got
fully re-randomized rather than gently edge-softened) into
intermediate alpha values. `avatar_v12.glb`'s original texture was close
enough to a hard binary (fully-opaque/fully-transparent) split that
whatever imperfect triangle sort order exists on this mesh didn't produce
a visible mis-blend. Phase 28's noise-based intermediate-alpha fringe, in
the specific region corresponding to the visible flap, pushed enough
pixels into a genuinely partial-alpha state that the mesh's
already-present (but previously inconsequential) sort-order imperfection
became visible as a distinct mis-rendered patch.

The feathering hypothesis is **partially confirmed, partially refuted**:
confirmed that Phase 28's alpha changes are the proximate cause of the new
visibility; refuted that a discrete "hidden card" was revealed — the real
mechanism is a blending/sort-order interaction with a structural property
(thin-island over-erosion) of the feathering script itself, on geometry
that was always structurally capable of this failure mode.

## Evidence

- `phase29_opaque_silhouette_top.png` — forced-opaque debug render, no flap present in geometry.
- `phase28_cmp_baseline_top.png` (existing, Phase 28's own) — v12 top view, clean.
- `phase28_v16_view_top.png` / `phase28_v16_view_front.png` (existing, Phase 28's own) — v16 top/front views, flap clearly visible.
- Numeric results above, from `phase29_diag_alpha.py`, `phase29_mesh_dump.py`, and the direct glTF JSON `alphaMode` check — all re-run in this phase, not assumed from Phase 28's own report.

## Recommended smallest safe correction (not implemented — awaiting approval)

Fix the feathering script itself, not the geometry or the alpha mode:
make the erosion radius **adaptive to each local opaque region's actual
width** (e.g., cap erosion at some fraction of the region's own measured
thickness, computed per-connected-component, rather than one fixed
70px applied uniformly) so thin strand regions get a proportionally
gentler edge treatment instead of having their entire area replaced by
noise. This directly targets the confirmed mechanism (thin-island
over-erosion → excessive intermediate-alpha coverage → exposed
sort-order artifact) without touching geometry, without changing
`alphaMode`, and without the broader risk of a geometry-level fix
reopening the bald-scalp failure mode that cost Phases 25-27 four
attempts. A faster, lower-effort alternative worth trying first: simply
reduce `FEATHER_BAND_PX` (e.g. to ~20-25px) so fewer thin regions are
fully consumed by erosion in the first place, accepting a less dramatic
feathering effect in exchange for not triggering this failure mode.

Waiting for approval before implementing either correction.

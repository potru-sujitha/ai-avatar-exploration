# Avatar Visual Quality Improvement

**Scope:** the female AI-interviewer avatar built this session on the
FLAME/Humanoid-Face-3D photo-reconstruction pipeline
(`experiments/photo-avatar-conversion-v2/Humanoid-Face-3D/scripts/build_full_avatar.py`,
output served at `experiments/conversation-avatar-poc/nextjs-poc/public/photo_avatars/woman.glb`,
viewed at `/photo-avatar-verify`). The male avatar (`man.glb`) was **not**
touched, per instructions — it remains the original head-only reconstruction
from earlier in this session.

## Investigation (before any change)

### 1. What this avatar actually is, end to end

- **Face**: a real FLAME-fitted, photo-textured mesh (5023 vertices) produced
  by `NetPranav/Humanoid-Face-3D`. The texture (`head_albedo_diffuse.png`) is
  a baked projection of the original photo: per `report.json`, only **33%**
  of the head's texture is *observed* from the real photo; **64%** is
  *synthesized own-skin fill* for areas the single front photo never saw
  (most of the scalp, sides, and back of the head). This one fact is the
  root cause behind several of the complaints below.
- **Hair**: not part of the FLAME reconstruction at all (FLAME models skull
  geometry only). It is 100% procedural, built by this session's own code:
  a tight scalp-hugging solid "shell" (a parametric dome mesh, flat vertex
  color, no texture) plus "cards" (curved, tapered ribbon strips with an
  alpha-cutout strand texture) layered at the sides/back for flow.
- **Torso/arms/hands**: also 100% procedural — tube-lofted cylinders
  (`tube_along_path()`) built from a neck boundary loop detected on the
  FLAME mesh, with flat vertex-color material (no UV texture at all).
- **Rendering**: a single GLB with 4 primitives sharing one mesh/node — face
  (textured, 52 ARKit morph targets), body (vertex-colored), hair cards
  (alpha-cutout textured), hair shell (vertex-colored) — rendered via a
  custom Three.js page (not the existing Gaussian-splat avatar pipeline).

### 2. Why the hairline shows a cap-like boundary

Confirmed, not assumed: the hair **shell** is a flat-vertex-colored
procedural mesh; the **face** is a photo-realistic baked texture. These are
two different rendering techniques meeting at a shared edge. Because the
scalp region of the face texture is mostly *synthesized* (smooth, generic
skin fill — see the 64% figure above, confirmed by rendering that exact
region and comparing it to the directly-photographed cheek/forehead), there
was never any real "hair-adjacent" photo detail for the procedural shell to
blend into. Combined with the original implementation using an **instant,
unblended color cut** at the shell's edge (hair_color on one side, nothing
on the other), this produced the sharp "cap" line visible in the screenshot.

### 3. Head/face/neck/hair overlaps and gaps

Checked by direct geometry inspection (not just visually):
- Shoulder: found a genuine geometry defect — the torso's ring-scale profile
  had only 6 rings spanning collar → shoulder → chest, with the scale
  jumping `1.55 → 1.95 → 1.75` in two steps. A sharp overshoot-then-retract
  with no intermediate smoothing on a radially-scaled loft **is** a conical
  spike, not a rounded shoulder. Compounding this, the arm tube's capped
  starting disc (added earlier this session to close a different, pre-existing
  dark-gap defect) sat at a slightly different depth/angle than the torso's
  own surface there, so the disc edge was visible as a separate flat "fin."
- Wrist/palm, finger bases, thumb base: inspected — all embed correctly
  with no visible seam or gap (this was fixed earlier this session and
  remains correct; no new issue found here).
- No new mesh intersections were found elsewhere.

### 4. Body/shoulder/arm/hand geometry and materials

All four are simple parametric tube lofts (circular or slightly-flattened
cross-sections) with a single flat vertex color each (blazer gray, skin
tone) — **no UV texture, no normal map, no roughness variation at all**.
This is the direct, confirmed cause of the "low-poly, artificial, flat
clothing" complaint: there is currently zero surface detail for light to
catch, by construction, independent of lighting setup.

### 5. What is fixable now vs. structurally out of reach

**Fixable with the current toolchain (material/geometry only, no new assets, no paid APIs):**
- Shoulder spike → geometry fix (more/smoother loft rings).
- Shoulder "fin" artifact → geometry fix (remove a bad embed offset).
- Flat clothing → shader-level fix (procedural fabric-weave normal
  perturbation; no UV pipeline needed).
- Hairline hard cut → partial fix (color feathering at the shell boundary).

**Not realistically fixable without new tooling (stated honestly, not worked around):**
- A fully seamless hairline would need either (a) real alpha-transparency
  blending into the actual face texture underneath (technically the
  "correct" fix, but introduces transparency sort-order risk this session
  did not have time to validate safely across viewing angles), or (b)
  photoreal hair-texture detail painted into the synthesized scalp region of
  the face texture itself (would require an inpainting/generative texture
  tool not available here). Neither was attempted; the shipped fix is a
  genuine, measured improvement, not a full resolution.
- True sculpted/rigged body and cloth-simulated clothing are out of reach
  without Blender or a dedicated character-art tool, confirmed unavailable
  in this environment earlier this session.
- No new paid assets, models, or APIs were considered or used, per
  instructions.

## Changes made (smallest safe set, each tied to a root cause above)

All changes are in
`experiments/photo-avatar-conversion-v2/Humanoid-Face-3D/scripts/build_full_avatar.py`.
No changes were made to the face mesh, its UVs, its texture, its 52 ARKit
morph targets, the MediaPipe/viseme pipeline, the rendering page's camera,
or the male avatar.

1. **Shoulder geometry smoothing** — `torso_profile` expanded from 6 to 9
   rings with smaller per-step scale deltas (same overall silhouette/width,
   peak still 1.95x), removing the sharp overshoot-then-retract that
   produced the spike. The arm-attachment ring index was updated to match
   (`torso_profile[4]`, was `[2]`).
2. **Shoulder "fin" removal** — removed a `shoulder_embed_dir` offset that
   was pushing the arm's capped starting disc to a slightly different
   depth/angle than the torso surface there; the arm now starts exactly at
   the chosen shoulder point, eliminating the wedge-shaped mismatch. (This
   also fixed a latent bug introduced mid-session: an intermediate attempt
   left two identical consecutive path points, which produced a
   divide-by-zero/NaN in the tube-tangent calculation and crashed GLB
   export — caught and fixed by removing the redundant point outright.)
3. **Fabric weave shading** — added a moderate-frequency, low-amplitude
   two-directional normal perturbation to the body mesh's *fabric* vertices
   only (hands/skin excluded via the existing `is_hand` mask), then
   re-normalized. This is a shading-only change (affects how light reflects
   off the surface); it does not alter geometry, silhouette, or any joint
   fix made earlier.
4. **Hairline color feathering** — the hair shell's vertex colors now blend
   from `hair_color` toward a muted mid-tone (`[0.80, 0.62, 0.52]`, picked to
   avoid the oversaturated tone used for the hands, which produced an
   orange halo when tried first) over the last ~7° of the dome's surface,
   using a power curve (`feather**2.2`) so most of the band stays close to
   the hair color and only pulls toward skin tone right at the edge.

## Before / after visual comparison

All images below are from this session's own renders of the *same* avatar
build, at the *same* camera framing, taken immediately before and after the
changes in this report.

| | Before | After |
|---|---|---|
| Full front | ![before](avatar_visual_quality_assets/before_front.png) | ![after](avatar_visual_quality_assets/after_front.png) |
| Shoulder (zoomed) | ![before](avatar_visual_quality_assets/before_shoulder_zoom.png) | ![after](avatar_visual_quality_assets/after_shoulder_zoom.png) |
| Hairline (zoomed) | ![before](avatar_visual_quality_assets/before_hairline_zoom.png) | ![after](avatar_visual_quality_assets/after_hairline_zoom.png) |
| Side (3/4, 70°) | *(not separately captured before — side view was not flagged as a problem area in the original complaint)* | ![after](avatar_visual_quality_assets/after_side.png) |

**What changed, read directly off the images:**
- Shoulder: the sharp triangular notch/fin is gone; the collar → shoulder →
  sleeve line is now one continuous curve.
- Hairline: the instant hard color cut is gone, replaced by a soft gradient
  band. It is **visibly better** than before (no longer a razor edge) but a
  faint pale transition band is still visible on close inspection — this is
  the honestly-reported partial fix described above, not a full resolution.
- Fabric weave: the effect is intentionally subtle (a shading/micro-detail
  fix, not a new texture) and is not easily visible at these screenshot
  resolutions/lighting angles; it is present in the geometry data and will
  read more clearly under stronger directional lighting or closer zoom.

## Remaining visual limitations (stated plainly)

- Hairline transition is softened but not seamless — see above.
- Clothing still reads as a smooth, synthetic material at a glance; the
  weave perturbation is real but subtle, not a substitute for an actual
  fabric texture/normal map pipeline.
- Body/arm/hand geometry remains simple parametric tube lofts — believable
  at interview-camera framing and distance, not sculpted anatomy.
- These are the same structural limitations already identified and reported
  earlier this session (no Blender, no sculpting/UV tooling, no licensed
  body/hair/cloth asset available) — this pass did not change that overall
  ceiling, only pushed quality up within it.

## Is this suitable for a professional interview avatar?

**Yes, at typical interview-camera framing and distance (the half-body,
medium shot this system is actually used at).** The face — the part an
interview subject looks at and focuses on — is a real, detailed, photo-
textured reconstruction with working expressions and lip-sync, and the
newly-fixed shoulder geometry removes the most visually jarring "basic
mannequin" tell. Under close zoom or scrutiny, the hairline and clothing
still read as procedural rather than photoreal, which is an honest,
disclosed limitation of this toolchain rather than a claim of full
photorealism.

## Follow-up round: "looks like separate body parts" (hair shininess)

A later screenshot review (`/photo-avatar-verify`, shoulder fix confirmed
holding up — no spike visible) flagged a further, more specific symptom of
the same "pieces glued together" complaint: the hair shell was visibly
*shinier* than the matte face and clothing, reading as a separate plastic
object rather than part of one character.

**Investigation, not assumption:**
- Confirmed the hair materials really were glossier than face/body:
  `roughnessFactor` 0.45 (cards) / 0.58 (shell) vs. 0.75 for face and body.
- First fix: raised both to 0.68/0.72, close to face/body. **Verified via
  direct pixel sampling of the rendered output that this had zero
  measurable effect** on the highlight brightness (identical max/mean
  values before and after). Pushed further to 0.86/0.88 (near-maximum
  roughness) — **still zero measurable change**, confirmed by sampling again.
- Root cause, confirmed by direct material inspection in the live loaded
  scene (not guessed): the visible "shine" was never primarily a specular
  effect. `roughnessFactor` in PBR only controls the specular highlight
  term; a perfectly smooth, featureless dome under one directional key
  light still shows one continuous, unbroken **diffuse (Lambertian)**
  brightness gradient from crown to edge regardless of roughness, and that
  smooth, geometrically-simple gradient is what reads as "molded plastic" —
  not shininess per se.

**Fix applied (geometry + color, not material sliders):**
- Added a second, interior-only geometric bump term to the hair shell
  (stronger near the crown/back, faded to the original subtle amount right
  at the hairline edge so the earlier-fixed jagged-silhouette issue is not
  reintroduced).
- Added a second, larger-scale "blotch" color-noise term alongside the
  existing fine noise, so the surface carries both strand-level and
  clump-level tonal variation instead of one smooth tint.
- Confirmed visually, at a matched crop before/after
  (`crown_before_round2.png` / `crown_after_round2.png`): the silhouette at
  the crown is now visibly irregular rather than a perfect smooth arc,
  confirming the geometry change is actually taking effect (a global
  brightness-std pixel metric was tried first and proved too insensitive to
  pick this up — it's swamped by the large-scale lighting gradient — so the
  claim here rests on the matched-crop visual comparison, not that metric).

**Honest assessment:** this is a real, measurable improvement in surface
complexity, not a cosmetic slider change — but it is also not a complete
fix. A procedural dome, however much noise is added to it, still cannot
replicate the fine strand-level detail of real or professionally-sculpted
CG hair. This is the same structural ceiling already disclosed above
(no Blender/sculpting tool available), now with a more precise root cause
on record: the issue was diffuse-shading smoothness, not PBR roughness, and
roughness-only fixes for this class of complaint will not work — confirmed
by direct measurement, not assumption.

## Regression test results

Ran the existing automated lip-sync check
(`experiments/conversation-avatar-poc/nextjs-poc/verify_photo_lipsync.cjs`)
against the rebuilt `woman.glb`, with `man.glb` left untouched as a control:

| Avatar | Samples | jawOpen min | jawOpen max | Variance | Result |
|---|---|---|---|---|---|
| Female (after shoulder/hairline fixes) | 20 | 0.0186 | 0.1404 | 0.1218 | ✅ Real mouth movement confirmed |
| Male (unchanged, control) | 6 | 0.0133 | 0.1077 | 0.0944 | ✅ Real mouth movement confirmed |
| Female (after follow-up hair-surface round) | 17 | 0.0172 | 0.1460 | 0.1288 | ✅ Real mouth movement confirmed |
| Male (unchanged, control, re-run) | 12 | 0.0186 | 0.1011 | 0.0825 | ✅ Real mouth movement confirmed |

Also confirmed directly against the running `/synthesize` backend and the
loaded Three.js scene (not just this one script):
- **52/52 ARKit morph targets** present and wired on the female mesh
  (unchanged — this pass never touched the face primitive, its UVs, or its
  targets array).
- **MediaPipe/viseme pipeline**: unaffected — this pass only edited
  procedural body/hair geometry and materials in a separate GLB primitive;
  the face primitive's vertex data, accessor layout, and morph target
  deltas are byte-identical to before this change.
- No regressions found in either avatar.

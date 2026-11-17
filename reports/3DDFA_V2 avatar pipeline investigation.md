# 3DDFA_V2 photo-to-avatar pipeline: feasibility investigation

**Scope:** investigation only, per the user's execution instructions. No code in `src/renderer.ts`, `src/TalkingAvatar.ts`, `avatars/female.glb`, or `demo/` was touched. This builds directly on `reports/Open source photo to avatar pipelines.md` (prior session research) and goes one level deeper specifically on the 3DDFA_V2 path the user has now chosen.

**Headline finding, stated up front because it changes the recommendation:** 3DDFA_V2's own repository documents that its 3D reconstruction is **not actually BFM-free or license-clean** — the dense mesh it produces is generated from a modified Basel Face Model 2009 asset (`configs/bfm_noneck_v3.pkl`) whose own README states flatly: *"the modified BFM2009 face model is restricted to academic-only use. For commercial use, you have to apply for another agreement."* ([`bfm/readme.md`](https://github.com/cleardusk/3DDFA_V2/blob/master/bfm/readme.md)). 3DDFA_V2's MIT license covers only the *code*; it does not and cannot relicense the geometry/data it depends on. This is the same structural trap the prior report found in DECA/EMOCA/FLAME, just one layer deeper in the dependency tree — the MIT badge on the repo is true and simultaneously not sufficient for a commercial product. This does not make the rest of this investigation moot (the technical findings below are real and reusable), but it does mean the user's licensing requirement ("no non-commercial, research-only... weights") is **not met by 3DDFA_V2 as currently shipped**, and this must be resolved (commercial BFM license, or a different reconstruction source) before shipping, not discovered later.

---

## Architecture

The pipeline as it would actually have to be built (no step here exists pre-built end-to-end; every arrow is a gap the user would be implementing):

```
[1] Single photo
      │  3DDFA_V2 inference (FaceBoxes detector → MobileNet regressor → BFM2009 coefficient decode)
      ▼
[2] Dense 3D mesh, FIXED topology, 38,365 vertices, in BFM2009 vertex order/triangulation
      + optional UV-mapped texture (projected from the input photo onto the mesh's UV layout)
      │  (3DDFA_V2 exports this as .obj / .ply today — NOT glTF/GLB)
      ▼
[3] Topology gap-filling / grafting  ←── NOT provided by 3DDFA_V2 or any tool found
      (BFM2009 has no eye sockets/eyeballs, no inner mouth/teeth/tongue, truncated/simplified ears —
       a talking, blinking avatar needs these; they must be grafted on from elsewhere, see Risks)
      ▼
[4] One-time: hand-authored ARKit-52 + Oculus-15 blendshape template
      built directly on the SAME 38,365-vertex BFM2009 topology (see Phase 2 — this does not exist
      anywhere today; it is bespoke modeling work)
      │  because topology is IDENTICAL and fixed across every 3DDFA_V2 reconstruction, each
      │  blendshape's vertex-position DELTA from the template's neutral can be copied by vertex INDEX
      │  onto any reconstructed face's neutral — no deformation-transfer/ICP/registration step needed
      │  for this specific pairing (a real technical shortcut, see Phase 3)
      ▼
[5] Personalized mesh + all 67 blendshapes, still OBJ/PLY, built in Blender via Python (bpy) scripting
      ▼
[6] Blender glTF2 exporter → GLB, shape keys → mesh.extras.targetNames (Blender's own convention,
      not core glTF 2.0 spec — see Phase 4 for the exact matching rule this depends on)
      ▼
[7] Validate: gltf-validator + a real three.js GLTFLoader script (model this session's own
    debug_facecenter.mjs) + in-browser multi-angle visual check
      ▼
[8] @interviewflowai/talking-avatar: setAvatar(newUrl, morphTargets) as a SEPARATE demo avatar
    (no change to renderer.ts/TalkingAvatar.ts required for this — see Phase 5)
      ▼
[9] Existing audio-driven lip-sync, blink, smile, listening/thinking expressions — unmodified,
    driven purely by morph-target names/values exactly as for the Rocketbox avatar today
```

The only genuinely "solved" stages today are [1]/[2] (3DDFA_V2 itself, modulo the license issue) and [7]/[8]/[9] (this session's own existing tooling and SDK). Stages [3], [4], [5]/[6] are custom engineering with no off-the-shelf package.

---

## Phase 1 — 3DDFA_V2 technical findings

All claims below are sourced directly from the repo's README, its `bfm/readme.md`, and targeted web search — not assumed.

1. **Reconstruction mechanism:** a lightweight CNN (MobileNet V1 or a 0.5×-width variant, `configs/mb1_120x120.yml` / `mb05_120x120.yml`) regresses 3DMM (BFM2009-based) shape/expression/pose coefficients directly from a detected face crop — it is coefficient regression, not an iterative optimization or a neural radiance/splat method ([README](https://raw.githubusercontent.com/cleardusk/3DDFA_V2/master/readme.md)).
2. **Output type and topology:** the dense reconstruction has **38,365 vertices** ("more than 30,000 points, i.e. 38,365"), and — because it is a linear 3DMM decode — **the vertex count, ordering, and triangulation are identical for every single reconstruction**; only vertex *positions* change per input photo. This is the single most useful fact for Phase 2/3 planning (see below). Sparse landmark count is not stated in the README.
3. **Texture:** both geometry and a "uv texture mapping" feature are present — texture is **projected/sampled from the input photo** onto the mesh's existing UV layout, not a separately learned/completed texture (no generative texture-completion model is described). Expect visible seams/artifacts anywhere the photo doesn't show the face straight-on (sides of the head, under the chin, closed-mouth interior) since there is nothing to hallucinate missing texture.
4. **Export formats:** confirmed as **`.obj` and `.ply` only**, via flags in `demo.py`. **No GLB/glTF export exists in this repo.** A conversion step is mandatory, not optional — practically, importing the OBJ+texture into Blender via its standard OBJ importer, then exporting via Blender's glTF2 exporter (same tool this session already used successfully for the hair-transplant work) is the straightforward path; no custom OBJ→GLB tool needs to be written, Blender already does this correctly for a textured static mesh.
5. **Facial geometry limitations — confirmed, and significant:** BFM2009 (and therefore 3DDFA_V2's output) is a face-region-only morphable model. The README explicitly flags **eye landmark/region inaccuracy, especially closed eyes** ("the landmarks of eyes are not accurate when closing... eye region of the webcam demo is ugly"). Separately (general BFM2009 knowledge, consistent with the README's silence on the topic): BFM2009 has **no modeled eyeballs/sclera, no inner-mouth/teeth/tongue geometry, and a simplified or absent ear/neck region** (the file is explicitly named `bfm_noneck_v3.pkl` — "noneck" in the filename itself confirms the neck is cut off). None of ears, teeth, tongue, or eyeballs are mentioned anywhere in the README — not a documentation gap, but consistent with BFM2009 being a face-surface-only model. **This means stage [3] in the architecture above (grafting in eye sockets + eyeballs + inner mouth) is a real, unavoidable modeling task**, not a convenience step — without it, a blink produces an eyelid closing over an empty eye socket (or, if eyeballs are naively left absent, a visibly broken/hollow blink), and a mouth-open viseme shows an empty interior instead of teeth/tongue. The realistic source for this grafted geometry is the project's **existing Rocketbox eye/teeth assets** (already present in `avatars/female.glb`, MIT-licensed, proven to work with the current blink/mouth morph system) — hybridizing "3DDFA_V2 face shell + Rocketbox eyes/teeth/inner-mouth" is more tractable than sourcing or building new eye/teeth geometry from scratch, but it is itself a nontrivial Blender modeling task (boolean/retopology work to merge two unrelated meshes around the eye sockets and mouth opening without visible seams).
6. **Local/offline runnability:** confirmed CPU-capable and fast — **~1.35ms per image on CPU with ONNX Runtime, 4 threads** (README's own benchmark). No GPU is required for inference. Dependencies: PyTorch, numpy, opencv-python, onnxruntime; macOS additionally needs `libomp` for the `--onnx` path. No training is needed (only inference), so there is no multi-GPU/VRAM concern at all for this stage — it is the cheapest, fastest stage in the whole pipeline by far.
7. **Face detector (FaceBoxes) license:** the README names it as adapted from `FaceBoxes.PyTorch` but states no license for the detector weights specifically; this was not resolved further in this pass and should be treated as **unverified** — check `FaceBoxes.PyTorch`'s own LICENSE directly before commercial use (not done in this investigation; flagged as a remaining gap).
8. **Code license:** reconfirmed **MIT** at the repository root (badge + LICENSE file present) — this part of the prior report's finding stands.
9. **The BFM/3DMM asset license — the critical, previously-unresolved finding, now resolved:** `bfm/readme.md` explicitly states the bundled `configs/bfm_noneck_v3.pkl` is a **modified BFM2009 model restricted to academic use only**, with commercial use requiring **a separate agreement** (the repo links to the University of Basel's BFM2009/BFM2019 pages). Separately, the Basel Face Model's own published non-commercial license agreement confirms this: it grants rights "for internal, non-commercial research, evaluation or testing purposes" only, and commercial licensing inquiries are explicitly routed to **Unitectra** (the University of Basel's technology-transfer office, `mail@unitectra.ch`) ([BFM2019 NonCommercial License Agreement](https://faces.dmi.unibas.ch/bfm/BFM2019_NonCommercial_License_Agreement.pdf), [BFM2019 page](https://faces.dmi.unibas.ch/bfm/bfm2019.html)). **No public price was found for a commercial BFM license** — it requires direct negotiation with Unitectra, with no published rate, meaning cost and feasibility for a specific project are unknown without contacting them directly.

---

## Phase 2 — Reusable ARKit-52 + Oculus-15 template rig

**No free, open-source, ready-made ARKit-52 blendshape template head was found.** A dedicated search for one turned up only paid marketplace assets (e.g. a Fab.com UE5 character listing bundling 52 ARKit blendshapes with a full rigged character, commercial/paid) — nothing CC0, MIT, or otherwise freely redistributable. This matches and reinforces the prior research's conclusion from the rigging-focused researcher: there is no shortcut around hand-authoring.

What *does* exist, and how it actually helps:
- **`tsikerdekis/ARKit-Creator-Blender-Addon`** (MIT) and **`elijah-atkins/ARKitBlendshapeHelper`** (license undocumented, per prior research) are *bakers*: they take a mesh that is **already rigged and posable** (bones/drivers for jaw, eyes, brows, etc.) and automatically generate the 52 ARKit shape keys by posing the rig into each reference expression and baking the result as a shape key. They do not create a rig from nothing, and they were not independently verified in this pass to output the *exact* ARKit camelCase string names needed for the renderer's dictionary lookup (`mesh.morphTargetDictionary[name]` requires an exact string match, not fuzzy matching) — a manual rename/QA pass should be assumed necessary regardless.
- **MediaPipe's Face Landmarker** blendshape *names* (confirmed in the prior session's research to match ARKit convention for `jawOpen`, `browDownLeft`, `browInnerUp`, `eyeBlinkRight`, etc.) are useful only as a **naming reference** and as a live *driving signal* source for testing — they do not supply a 3D mesh or shape-key geometry at all.
- **Apple's own ARKit documentation** (the `ARFaceAnchor.BlendShapeLocation` reference, listing and briefly describing all 52 shapes with their semantic meaning) remains the authoritative naming/behavior reference for hand-authoring, since no code tool substitutes for understanding what each named shape should visually do.

**Realistic conclusion, stated plainly per the user's "do not fake support" instruction:** there is no way to avoid hand-sculpting the 52 ARKit + 15 Oculus (67 total, with some overlap/redundancy between the two sets around mouth shapes) blendshapes at least once, on one template mesh. Doing this directly on 3DDFA_V2's exact 38,365-vertex BFM2009 topology (rather than on an unrelated topology, then deformation-transferring) is strongly preferable because it makes Phase 3 nearly free (see below) — but it means starting from a neutral BFM2009-topology export as the sculpting base in Blender, using one of the ARKit-baking add-ons above *if* a bone rig is built first, or fully manual shape-key sculpting otherwise.

**Effort estimate:** this is genuine character-rigging/blendshape-sculpting work, not scripting. For an experienced 3D character artist familiar with facial blendshape conventions, authoring 67 clean, non-overlapping, correctly-named shapes on one template mesh (including a proper jaw-open with correctly hinged rotation, believable eyelid blink without self-intersection, and ARKit's finer shapes like `cheekPuff`, `noseSneerLeft/Right`, `tongueOut`) realistically takes **several days to one–two weeks** of dedicated modeling time, not hours — and is a skill the user should expect to either hire for or invest significant time learning, not something an engineer can script around. This is the single largest, least automatable cost in the entire pipeline, consistent with the prior report's conclusion that this missing template is "the single highest-leverage artifact" in the whole ecosystem.

---

## Phase 3 — Transfer technique comparison

**Key finding specific to 3DDFA_V2 (not available to the FLAME/DECA path the prior report evaluated):** because 3DDFA_V2's dense mesh topology is **fixed and identical across every single reconstruction** (same 38,365 vertices, same index order, same triangulation — a direct consequence of it being a linear 3DMM coefficient decode), transferring blendshapes from a template built on that *same* topology reduces to:

```
personalized_blendshape[i] = personalized_neutral[i] + (template_blendshape[i] - template_neutral[i])   for each vertex i
```

This is **plain per-vertex delta addition by matching index** — no mesh registration, landmark alignment, non-rigid ICP, or deformation-transfer library is required *for this specific pairing*, because vertex correspondence is exact and free (guaranteed by construction, not approximated). This is a genuine simplification over the general case and over the FLAME path the prior report evaluated (where the same principle technically applies too, but wasn't highlighted as explicitly). The general-purpose tools surveyed previously (`wuhaozhe/pytorch-nicp`, `jerenchen/deformxfer`, `mickare/Deformation-Transfer-for-Triangle-Meshes`) become **unnecessary for this exact case** — they exist to solve correspondence between *different* topologies, which this pairing does not have. They would only become relevant again if the project later needs a second, differently-topologized reconstruction source, or needs to transfer the finished BFM-topology template onto a non-3DDFA_V2 mesh.

The important caveat: naive per-vertex delta addition assumes the personalized neutral and the template neutral are reasonably similar in scale/proportion locally around each moving region (mouth, eyes, brows). Where a reconstructed face has very different proportions from the template (e.g. a much wider or narrower mouth, a different jaw width), a pure linear delta can look subtly wrong (too much or too little lip opening relative to the new mouth's size) — a production pipeline should expect to apply a **per-region scale correction** (scaling each blendshape's delta by the ratio of the personalized face's local dimension to the template's, e.g. mouth width) rather than assuming raw deltas transfer with perfect realism. This is a reasonable, implementable refinement, not a research problem, but it is extra engineering beyond the "just add deltas" baseline.

**Per-failure-mode assessment, as requested:**
| Target behavior | Likely outcome with direct delta transfer | Why |
|---|---|---|
| P/B/M lip closure | **Should transfer cleanly** | Lip-closure deltas are localized and roughly rigid; BFM mouth region proportions vary modestly across individuals |
| Jaw opening range | **Mostly clean, may need the scale correction above** | Jaw hinge motion is close to rigid rotation; amount of opening may read as too much/little if jaw width differs significantly from the template |
| Lip rounding / funnel (viseme_U, O) | **Likely clean** | Same reasoning as lip closure; these are small, localized deformations |
| Lip stretching (wide vowels, smile) | **Moderate risk** | Stretch amount is proportional to mouth width; most likely candidate for needing the per-region scale correction |
| Blink without eyelid self-intersection | **High risk — but primarily because of the Phase 1 grafted-eye-geometry problem, not the transfer method** | If eye sockets/eyeballs are grafted in (Phase 1, stage [3]) with different exact vertex positions than the template assumed, a direct index-matched eyelid delta can intersect or gap around the grafted eyeball; this needs manual per-avatar correction, not just automated transfer |
| Natural smile | **Moderate risk** | Smile muscles interact with cheek volume in a way that's more individual than mouth-shape visemes; likely to need manual touch-up for a convincing (not uncanny) result |
| Eyebrow movement | **Likely clean** | Eyebrow deltas are localized and largely rigid relative to the forehead |

Overall: **mouth/viseme shapes used for lip-sync are the most likely to transfer well with little manual correction** (good news for the primary use case — audio-driven speech), while **blink and smile are the most likely to need manual per-avatar touch-up**, primarily because of the grafted-eye-geometry seam problem identified in Phase 1, not a weakness of delta transfer itself.

---

## Phase 4 — GLB export and validation plan

Reusing the exact validated methodology from this session's hair-transplant work, adapted for a brand-new, non-Rocketbox avatar:

1. **Pre-flight checklist**, directly from lessons already paid for in this repo's history:
   - **No shape key may be muted** before export — Blender's glTF exporter silently *drops* muted shape keys rather than exporting them at zero weight, which is far more dangerous here than in the hair-transplant case: per the exact GLTFLoader source behavior confirmed in this investigation (see below), a **mismatched count between `extras.targetNames` and the actual morph target count causes the loader to discard ALL names, not just the missing one** — one accidentally-muted shape key can silently break every blendshape's name lookup on load, with a logged warning (`"THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names."`) easy to miss.
   - **Keep the head a single material / single primitive** where possible — a multi-material mesh gets split into multiple glTF primitives on export, which has been observed (per prior research notes) to duplicate the morph-target slider set per primitive in some viewers; for this renderer specifically, `renderer.ts`'s `faceMeshes` collection (`gltf.scene.traverse` pushing every mesh with a truthy `morphTargetDictionary`) would then receive multiple mesh entries for what should be one face, and the existing `setMorph()`/`applyMouth()` loops already iterate `for (const mesh of this.faceMeshes)` — this would likely still work correctly (every primitive gets the same influence value applied), but should be explicitly tested, not assumed, since it's new territory the hair-transplant work didn't exercise (that work kept hair as a separate *unskinned, non-morph* mesh, never multiple morph-bearing primitives for one logical face).
   - **No bone/armature re-export risk applies here the way it did for the Rocketbox hair transplant** — the specific bug found earlier (Blender's exporter recomputing inverse-bind matrices from mismatched rest-vs-pose bone data) was a property of *that specific existing armature*. If the new photo-avatar is built as a **static mesh driven purely by blendshapes with no skeleton at all** (very plausible — see Phase 5, the renderer does not require a skeleton for facial animation), this entire bug class **does not apply**, since there's no skin/armature to corrupt. This should be confirmed, not assumed, once an actual test export exists — verify no `<skin>` is present in the exported GLB's node/mesh structure if the design intent is "static mesh, blendshapes only."
2. **Automated validation**, mirroring `work/hair-experiment/scripts/validate_final.cjs` and `debug_facecenter.mjs` patterns already proven in this repo:
   - Run the official `gltf-validator` npm package (`validateBytes()`) on the exported GLB — catches structural issues (buffer count, accessor bounds, EMPTY_ENTITY scenes, etc.) before any visual check.
   - Write a small Node script using the *real* `three.js` `GLTFLoader` (not Blender, and not a glTF spec reading — the actual runtime library this SDK uses) to load the GLB headlessly and assert: every one of the 67 expected morph target names is present in `mesh.morphTargetDictionary`; setting each one to 1.0 and reading back vertex positions produces a nonzero, spatially-plausible delta (reusing the `debug_facecenter.mjs` technique of inspecting `mesh.geometry.morphAttributes.position` deltas directly, which is exactly how this session caught the Rocketbox skin-corruption bug that Blender's own renders had missed).
3. **Visual validation**: render (or load in the actual `demo/` dev server, already running in this project) the new avatar from front, three-quarter, and profile angles, with every blendshape individually driven to 1.0 in sequence, specifically checking: face does not distort at rest (0 weight on everything), eyes do not disappear or show gaps during blink, mouth does not break/invert during jaw-open + viseme combinations, textures remain correctly mapped (watch for seams at the grafted eye/mouth/ear boundaries from Phase 1 stage [3]), and the face is correctly centered by `renderer.ts`'s `faceCenter()` logic (which, absent a skeleton, falls back to scanning blink/jaw morph deltas — this should work for a blendshape-only mesh, but must be visually confirmed since it's new territory for this function, which has so far only ever run against Rocketbox's skinned topology).

---

## Phase 5 — SDK compatibility

Re-read directly from the current `src/renderer.ts` and `src/TalkingAvatar.ts` for this investigation (not assumed from memory):

**Confirmed: a fully separate second avatar can be added via `setAvatar(url, morphTargets)` with zero changes to renderer/SDK logic.** Concretely:
- `TalkingAvatar.setAvatar(url, morphTargets)` ([`TalkingAvatar.ts:144`](../src/TalkingAvatar.ts#L144)) just calls `this.renderer.load(url, morphTargets)` — nothing Rocketbox-specific is hardcoded in that call path.
- `AvatarRenderer.load()` ([`renderer.ts:241`](../src/renderer.ts#L241)) fully disposes the previous model and loads the new GLTF fresh; it collects `faceMeshes` by testing `mesh.morphTargetDictionary` truthiness ([`renderer.ts:262`](../src/renderer.ts#L262)) — **this has no dependency on skinning, bones, or any Rocketbox-specific naming**, so a static (non-skinned) blendshape-only mesh is fully supported by this exact line.
- The project's existing `H_EXPRESSIONS` auto-detection (`has("h_expressions.AE_AA_h")`) only activates for avatars using that specific naming scheme; a new avatar using plain ARKit/Oculus names, or a custom `morphTargets` map passed by the caller, is unaffected by it.

**Genuine compatibility risks identified, beyond simple name-mapping** (these are the ones the user specifically asked to be flagged as compatibility risks, not naming risks):

1. **Material classification (`refineMaterial`, [`renderer.ts:125`](../src/renderer.ts#L125)) is Rocketbox-specific and will silently no-op on the new avatar.** Its regex `/^[fm]\d+_(head|body)$/` matches Rocketbox's atlas material names (e.g. `f01_head`) only; a photorealistic avatar's own material names won't match, so none of the skin/eye PBR calibration (roughness, clearcoat, sheen tuning) will apply — the new avatar will render with whatever materials Blender's export produced, completely unrefined by this code path. **This is not a bug that needs fixing to ship a working demo** (the function's `if` guard safely passes the material through unchanged when it doesn't match), but it does mean the new avatar's realism will depend entirely on how well its own authored/exported PBR materials look out of the box — this session's own material-polish work for Rocketbox (clearcoat, sheen, roughness split by eye/skin detection) will need separate, analogous tuning for the new avatar if its default materials look flat, and that tuning is presently hardcoded to Rocketbox's naming and would need new code (a real, scoped follow-up task, not something to assume works).
2. **`faceCenter()`'s skeleton fallback ([`renderer.ts:99`](../src/renderer.ts#L99)) assumes a bone named exactly `"Head"` exists if no blink/jaw morph deltas are found** — for a bone-less, blendshape-only mesh this fallback won't be hit (the blink/jaw morph-delta path, which comes first, should succeed as long as `eyeBlinkLeft`/`eyeBlinkRight`/`jawOpen` morph targets exist and have nonzero deltas) **but if that primary path fails for any reason** (e.g. the blink morph has a negligible-magnitude delta that doesn't clear the function's `1e-4` threshold), the code falls through to the "whole bounding box" heuristic, not a graceful Rocketbox-style head-bone lookup, since there's no `"Head"` bone on a boneless mesh. In practice the blink/jaw path is very likely to succeed, so this is a low-probability but worth-testing risk, not a blocker.
3. **Camera framing constants are global, not per-avatar.** `FRAME_HEIGHT_M`, `MIN_FRAME_WIDTH_M`, and `FACE_Y_IN_FRAME` ([`renderer.ts:94-96`](../src/renderer.ts#L94)) are module-level constants tuned specifically to Rocketbox's real-world-meter head proportions and hair-top/shoulder geometry. **If the new avatar's exported mesh uses a different real-world scale** (e.g. Blender's default unit scale vs. the meter convention Rocketbox assets use, or simply a different head size), the close-up framing calculated in `frameFace()` ([`renderer.ts:419`](../src/renderer.ts#L419)) could crop the face incorrectly (too tight, too loose, or off-center vertically) **with no existing mechanism to override these constants per avatar** — there is currently no `load()` parameter for frame-height/offset overrides. This is a real, concrete integration task: either (a) ensure the new avatar's GLB is scaled/positioned to match Rocketbox's existing real-world convention exactly during the Blender export (straightforward if done deliberately, since Blender's exporter can bake a scale transform), or (b) add a new optional framing-override parameter to `load()`/`setAvatar()` (a small, scoped code change, not something to make silently or assume unnecessary).
4. **No skeleton means no bone-driven animation is possible for this avatar even if desired later** — this is not a current limitation since the renderer doesn't use bones for facial animation at all today (confirmed: the removed `nod()` feature was the only bone-rotation code path, and it's gone per the user's explicit instruction to keep it removed, which this investigation respects — no nod-like behavior is proposed or implied anywhere above), but it does mean this avatar could never get head-turn/idle-sway body language without later adding a skeleton to it — worth noting as a known ceiling, not a blocker for the current audio-lip-sync/blink/smile feature set.

---

## Required repositories

| Repository | Role | URL |
|---|---|---|
| 3DDFA_V2 | Phase 1 — single-photo 3D reconstruction | https://github.com/cleardusk/3DDFA_V2 |
| FaceBoxes.PyTorch | Face detector used internally by 3DDFA_V2 | linked from 3DDFA_V2's README |
| Rocketbox female avatar (already in this repo) | Source of eye/teeth/inner-mouth geometry to graft (Phase 1, stage [3]) | `avatars/female.glb` (this repo) |
| `tsikerdekis/ARKit-Creator-Blender-Addon` | Optional: bakes ARKit shapes from an already-rigged mesh | https://github.com/tsikerdekis/ARKit-Creator-Blender-Addon |
| `elijah-atkins/ARKitBlendshapeHelper` | Same role, license undocumented | https://github.com/elijah-atkins/ARKitBlendshapeHelper |
| Blender (4.5 LTS, already installed in this environment) | Mesh grafting, blendshape authoring, delta-transfer scripting, GLB export | https://www.blender.org/ |
| `gltf-validator` (npm) | Structural GLB validation (already used in this repo's hair-transplant work) | https://github.com/KhronosGroup/glTF-Validator |
| `@gltf-transform/*` (npm, already a dependency in this repo's `work/` scripts) | Surgical GLB post-processing if needed, without full Blender re-export | https://gltf-transform.dev/ |
| three.js (already this project's rendering dependency) | Authoritative GLTFLoader behavior for validation scripts | https://github.com/mrdoob/three.js |

Not required, and explicitly not recommended given the findings above: `wuhaozhe/pytorch-nicp`, `jerenchen/deformxfer`, `mickare/Deformation-Transfer-for-Triangle-Meshes` — these solve cross-topology correspondence, which this specific 3DDFA_V2-to-3DDFA_V2-topology pairing does not need (Phase 3 finding).

---

## License verification (updated from the prior report)

| Component | Code license | Weights / data license | Commercial use | Source |
|---|---|---|---|---|
| 3DDFA_V2 code | MIT, confirmed | — | Allowed (code only) | [LICENSE](https://github.com/cleardusk/3DDFA_V2/blob/master/LICENSE) |
| 3DDFA_V2's bundled BFM2009 asset (`bfm_noneck_v3.pkl`) | N/A (data, not code) | **Academic use only**; commercial use requires a separate agreement | **Blocked without a separate commercial license** | [`bfm/readme.md`](https://github.com/cleardusk/3DDFA_V2/blob/master/bfm/readme.md) |
| Basel Face Model (BFM2009/2019), the asset's origin | N/A | Non-commercial research/evaluation/testing only; commercial inquiries → Unitectra, no public pricing found | **Blocked pending negotiation** | [BFM2019 NonCommercial License Agreement](https://faces.dmi.unibas.ch/bfm/BFM2019_NonCommercial_License_Agreement.pdf), [BFM2019 page](https://faces.dmi.unibas.ch/bfm/bfm2019.html) |
| 3DDFA_V2's pretrained regressor weights (`mb1_120x120.pth`) | — | Not separately stated in the README; trained on 300W-LP (a public academic dataset whose own redistribution/commercial terms were **not verified in this pass** — flagged as an open gap) | **Unverified** | Not resolved — follow-up needed |
| FaceBoxes detector weights | — | Not stated in 3DDFA_V2's README | **Unverified** | Not resolved — follow-up needed |
| Rocketbox avatar assets (already in this repo) | MIT (per this repo's own `avatars/LICENSE`, already verified in the prior full-repo audit this session produced) | Same | Allowed | This repo's own `avatars/LICENSE` |
| `tsikerdekis/ARKit-Creator-Blender-Addon` | MIT | N/A (a Blender tool, no model weights) | Allowed | Repo's LICENSE (per prior research; not independently re-verified in this pass) |
| `elijah-atkins/ARKitBlendshapeHelper` | **Undocumented** | N/A | **Unverified** | Prior research flagged this gap; not resolved here |
| Blender itself | GPL-2.0-or-later | N/A | Allowed (Blender's own GPL license does not restrict commercial use of content created with it; Blender's own FAQ confirms user-created content/exports are not GPL-encumbered) | https://www.blender.org/about/license/ |
| gltf-validator, gltf-transform, three.js | Apache-2.0 / MIT (standard OSS) | N/A | Allowed | Respective repos |

**Bottom line on licensing:** the user's stated requirement — "do not use DECA/EMOCA or FLAME assets in a commercial pipeline unless the required commercial permission is obtained" — **applies identically to 3DDFA_V2's bundled BFM2009 asset**, which this investigation newly confirms. The code being MIT does not change this; the geometry data it decodes against is the same class of academically-licensed asset the user already correctly ruled out FLAME for. This is the single most important update this report makes to the user's stated plan.

---

## Dependencies (per stage)

| Stage | Dependencies |
|---|---|
| Phase 1 (3DDFA_V2 inference) | Python 3.x, PyTorch, numpy, opencv-python, onnxruntime; optional `libomp` on macOS |
| Phase 1→2 conversion (OBJ import) | Blender 4.5 LTS (already installed in this environment) |
| Phase 2 (template authoring) | Blender, a skilled 3D character artist, optionally `tsikerdekis/ARKit-Creator-Blender-Addon` if a bone rig is built first |
| Phase 3 (delta transfer) | A custom Python script (Blender `bpy` or standalone, using `numpy`/a glTF or OBJ library) — does not exist today, must be written; no third-party transfer library needed per the Phase 3 finding |
| Phase 4 (export/validation) | Blender's glTF2 exporter, `gltf-validator` (npm), Node.js + three.js for a custom validation script (mirroring this repo's existing `work/hair-experiment/scripts/*.cjs` patterns) |
| Phase 5 (SDK integration) | None beyond this repo's existing build (Vite/TypeScript, already set up) |

---

## GPU requirements (per stage)

| Stage | GPU requirement |
|---|---|
| Phase 1 (3DDFA_V2 inference) | **None** — confirmed CPU-capable at ~1.35ms/image via ONNX Runtime |
| Phase 2 (hand-sculpting template) | None (Blender modeling is CPU/GPU-viewport-light; any modern machine suffices) |
| Phase 3 (delta transfer script) | None (simple vector arithmetic on ~38K vertices × 67 shapes, trivial for any CPU) |
| Phase 4 (validation/rendering checks) | None required for `gltf-validator`/Node script; a GPU helps for faster interactive Blender/three.js preview but isn't required |
| Phase 5 (browser runtime) | A WebGL-capable GPU in the end user's browser — unchanged from the existing SDK's requirements today |

This pipeline is notably **lighter on GPU requirements than the Gaussian-Splatting or DECA/EMOCA paths** evaluated in the prior report — a genuine practical advantage of the 3DDFA_V2 choice, independent of the licensing issue.

---

## Estimated implementation complexity (per phase)

| Phase | Complexity | Why |
|---|---|---|
| 1 — 3DDFA_V2 setup + inference | **Easy** | Existing, documented, CPU-runnable repo; main blocker is licensing, not engineering |
| Eye/teeth/ear grafting (stage [3]) | **Difficult** | Bespoke Blender mesh-merging/retopology around the eye sockets and mouth opening with no seams; no tool automates this |
| 2 — Template blendshape authoring | **Difficult, and the largest single time cost** | Genuine character-rigging craft skill, 67 shapes, days to weeks of dedicated work |
| 3 — Delta transfer script | **Medium** | The core math is simple (direct per-vertex delta, per the Phase 3 finding) but the per-region scale-correction refinement and the eyelid/grafted-eye interaction add real engineering |
| 4 — GLB export + validation | **Medium** | Mechanically similar to this session's own proven hair-transplant GLB pipeline, but exercises new code paths (multi-primitive morph meshes, boneless skin, globally-tuned camera framing) that must be tested, not assumed to carry over |
| 5 — SDK integration | **Easy** | Confirmed: existing `setAvatar(url, morphTargets)` API needs no renderer/SDK code changes for the core feature; only the optional per-avatar framing-override (risk #3 above) is new code, and it's small and scoped |

---

## Technical risks, ranked

1. **Licensing blocker (BFM2009 academic-only restriction) — highest severity, not a technical risk at all but a legal one.** Likelihood of being a real blocker: **confirmed, not speculative** — the repo's own README states it. **Fallback:** either (a) contact Unitectra for a commercial BFM license and get a cost/feasibility answer before investing further engineering time, or (b) abandon 3DMM-based reconstruction entirely and instead **texture-project the reference photo's likeness onto the existing, already-cleared Rocketbox head** (a lower-fidelity, geometry-unchanged "re-skin" rather than true personalized 3D reconstruction — zero new licensing risk, reuses 100% of the already-working rig/blink/viseme system, but will not capture the reference photo's actual facial *shape*, only its skin tone/texture/makeup styling). This fallback was not requested by the user but is the most honest "technically valid alternative" available today within the stated constraints, and is worth a direct answer from the user before more engineering time is spent on the 3DDFA_V2 path.
2. **Eye/teeth/inner-mouth grafting producing visible seams or broken blinks — high likelihood of needing multiple iterations.** 3DDFA_V2's face-only topology has no solution for this already built; it's bespoke modeling. **Fallback:** scope this explicitly as its own validated sub-task (build and visually confirm one grafted "neutral" head before investing in all 67 blendshapes on top of it) rather than discovering graft problems after the full template is built.
3. **Template-authoring effort being significantly underestimated — medium-high likelihood if treated as a quick task.** 67 production-quality blendshapes is specialist work. **Fallback:** budget for either hiring a character artist for this one-time asset, or treating it as a multi-week internal R&D task with an explicit go/no-go checkpoint after the first ~10 shapes are done (mouth/jaw/blink only) before committing to all 67.
4. **Camera-framing constants being Rocketbox-specific (`renderer.ts:94-96`) — low-medium likelihood of a real problem, easy to fix if it occurs.** **Fallback:** explicitly test the new avatar's default framing before assuming it looks right, and budget a small scoped code change (an optional per-avatar framing override) if it doesn't.
5. **Material realism depending entirely on the Blender export's default PBR setup, since `refineMaterial()`'s Rocketbox-specific tuning won't apply — medium likelihood of looking "flat" without follow-up work.** **Fallback:** treat material/lighting polish for the new avatar as a separate, explicit follow-up task (as this session already did once for Rocketbox), not something that "just works" by inheriting the existing lighting rig.
6. **Multi-primitive morph-mesh behavior and boneless `faceCenter()` fallback paths being untested in this renderer — low likelihood of breaking, but genuinely unverified.** **Fallback:** the validation plan in Phase 4 above is specifically designed to catch these before they reach a demo; do not skip the real-GLTFLoader validation script step even though it feels like "just a formality" based on the hair-transplant work's success.
7. **300W-LP dataset's and FaceBoxes detector weights' commercial-use terms — unresolved in this pass, low-to-unknown severity.** **Fallback:** verify both before any commercial deployment decision is finalized; this is a small, bounded follow-up (reading two more LICENSE files), not a structural blocker like risk #1, but it should not be left unchecked.

# MPFB Avatar GLB Export Defect Investigation — Phase 3

**Status note:** the background agent that ran this investigation completed
all the technical work below (confirmed by its own artifacts: scripts,
JSON dumps, validator report, and before/after screenshots) but stalled
during report-writing (a 600-second stream watchdog timeout, not a crash
mid-experiment). This report was written directly from those artifacts —
every claim below is backed by a file in
`poc/mpfb-avatar-poc/phase3-defect-investigation/`, re-checked directly,
not restated from the stalled agent's own summary.

**Root cause found and fixed in this phase.** The Phase 2 report's
conclusion ("defect baked into the GLB by an unknown mechanism") is now
resolved: it was a **glTF material `alphaMode` mismatch**, not a geometry,
rig, or modifier-ordering problem.

---

## 1. Tools and versions used

- Blender 4.5.10 LTS (`C:/Program Files/Blender Foundation/Blender 4.5/blender.exe`), headless (`--background --python`).
- Khronos glTF Validator, Node package, run against `avatar_v2.glb`.
- Three.js (served locally via `poc/mpfb-avatar-poc/phase3-defect-investigation/serve.cjs` + a plain Puppeteer screenshot script, `screenshot_threejs.cjs`), to test the defect completely independent of TalkingHead.
- No second Blender version was available on this machine (checked common install locations — only 4.5.10 LTS is present) — step 6 of the requested scope ("test an older Blender version") was not performed; this is an explicit gap, not a silent skip, since installing a second Blender version purely for this diagnostic wasn't judged a trivial, low-risk action worth taking unprompted.

## 2. glTF Validator results

Full output: `poc/mpfb-avatar-poc/phase3-defect-investigation/gltf_validator_report.json`.

**0 errors, 11 warnings, 3 infos** — the file is schema-valid. None of the
warnings mention alpha, materials, or transparency at all:

- 3× `MESH_PRIMITIVE_GENERATED_TANGENT_SPACE` (meshes 0, 2, 5 — normal-mapped materials without a tangent attribute; cosmetic/portability note, unrelated to this defect).
- 7× `NODE_SKINNED_MESH_NON_ROOT` (nodes 76–83 — skinned mesh nodes aren't scene roots; this is standard for an armature-parented rig and not itself a rendering defect).
- `IMAGE_NPOT_DIMENSIONS` (a 3600×3600 texture — power-of-two isn't required by modern glTF renderers; informational only).

**Conclusion from this step: a clean validator pass does not mean the file
renders correctly.** The actual defect is a semantic mismatch (the wrong
`alphaMode` value is itself perfectly valid glTF), which is exactly the
kind of bug a schema validator cannot catch. This is worth stating
plainly since the Phase 2 report leaned on "defect reproduces in a fresh
Blender scene" as evidence of a deep, mysterious problem — it's actually a
narrow, well-known category of glTF export bug.

## 3. Minimal single-mesh reproduction

Script: `minimal_repro_export.py`. Isolated three independent exports, each with just the armature (required for skinning) plus one group of meshes:

- `minimal_suit.glb` — the business-suit mesh alone.
- `minimal_mouth.glb` — teeth + tongue alone.
- `minimal_body.glb` — the base body mesh alone, as a known-good control (confirmed clean in Phases 1–2).

Rendered each independently via `render_minimal.py` (Blender) and
`screenshot_threejs.cjs` (Three.js). **Both `minimal_suit.glb` and
`minimal_mouth.glb` reproduced their respective defects in complete
isolation** — the torn-hole clothing artifact and the open/discolored
mouth are each independently reproducible from a single mesh plus
armature, with no other avatar parts involved. This confirms the defect
is local to those two specific materials, not an interaction between
meshes or a whole-rig problem.

## 4. Geometry comparison: Blender-native vs. re-imported GLB

Dumped via `dump_blender_geom.py` (native scene, pre-export) and
`dump_reimport_geom.py` (same meshes, re-imported from the exported GLB)
into `blender_native_geom.json` / `reimported_geom.json`.

For the suit mesh specifically: native Blender reports 2205 vertices;
the re-imported GLB reports 2424 vertices and 4192 polygons. **This
difference is normal, expected glTF export behavior** — glTF duplicates
vertices along UV seams and hard edges (Blender's internal vertex count
and glTF's indexed-vertex count are different units), not evidence of
corruption. Critically, the **bounding box and sample vertex positions
match to within floating-point rounding** between native and re-imported
geometry (e.g. first vertex `[0.0856679, -0.1264083, 0.9137983]` native vs.
`[0.0856679, -0.1264083, 0.9137983]` re-imported). **Geometry is correctly
preserved through export/re-import — this rules out a mesh-corruption or
vertex-displacement explanation entirely**, and is consistent with — not
contradictory to — the material-level root cause found below.

## 5. Root cause: material `blend_method` never set, wrong `alphaMode` baked into GLB

Found via `check_blend_method_api.py`, confirmed via `test_fix_alpha.py`.

MPFB's documented workflow (`blender/MPFB/MPFB.md`, "MASK / Alpha Clip"
section) requires a **manual Blender step**: for any mesh needing cutout
transparency (teeth gaps, clothing seam edges), add a Math "Greater Than"
node before the Principled BSDF's Alpha input, and separately set the
material's alpha-rendering mode so Blender's own alpha-clip behavior is
active. The automated pipeline built in Phase 1 **never performed this
step** — the three affected materials (`Human.female_elegantsuit01`,
`Human.teeth_base`, `Human.tongue01`) were left at Blender's default blend
mode. Querying `mat.blend_method` directly confirmed this is a live,
settable property in Blender 4.5.10 (not deprecated, contrary to one
working hypothesis going into this phase) — it was simply never set by
the generation script.

Because `blend_method` was left unset/default, Blender's glTF exporter
wrote the wrong `alphaMode` (not `MASK`) into the exported GLB's material
definitions. Any renderer — Blender re-importing its own export, or
Three.js — then interprets each material's alpha channel according to
that wrong mode, which is exactly why the live, pre-export Blender
viewport looked fine (it renders the *scene's* shader graph directly, not
the exported glTF material fields) while every GLB-based render —
Blender-reimport and Three.js alike — showed the same defect. This fully
resolves the Phase 2 mystery ("flawless in Blender, broken everywhere a
GLB is involved") with a concrete mechanism instead of an open question.

**Fix, applied and tested** (`test_fix_alpha.py`): set
`mat.blend_method = 'CLIP'` with `alpha_threshold` tuned per material
(0.5 for the suit, 0.4 for teeth/tongue), then re-exported the same
isolated meshes as `fixed_suit.glb` / `fixed_mouth.glb`.

A second, even more minimal confirmation (`patch_alphamode.cjs`) patched
the already-exported `minimal_suit.glb`/`minimal_mouth.glb` files
directly — rewriting each material's JSON `alphaMode` to `"MASK"` with
`alphaCutoff: 0.5` by editing the GLB's JSON chunk in place, with **no
Blender involved at all** — producing `mask_patched_suit.glb` /
`mask_patched_mouth.glb`. Both the Blender-side fix and this
file-level-only patch independently produced correct rendering, which is
strong confirmation the `alphaMode` field itself is the actual mechanism,
not some other coincidental side effect of re-exporting.

## 6. Before/after visual proof

Screenshots `threejs_before_fix.png` / `threejs_after_fix.png`
(`poc/mpfb-avatar-poc/phase3-defect-investigation/`), both captured via
plain Three.js with **zero TalkingHead code involved**, pure bind pose:

- **Before**: mouth rendered wide open with a grotesque, bloodied
  appearance (visible teeth/gum texture bleeding through incorrectly),
  and a sharply jagged cutout at the shirt collar.
- **After**: mouth closed, natural resting expression; shirt collar
  renders as a correctly-fitted, clean V-neck with no holes. Hair,
  eyebrows, and skin tone are unaffected by the fix (as expected, since
  only three specific materials were touched).

This is the single clearest piece of evidence in the whole investigation
— the same geometry, same textures, same rig, with only three materials'
`alphaMode` corrected, goes from genuinely disturbing to a normal-looking
face and collar.

## 7. What was ruled out, across all three phases

- Stray Subdivision modifiers (Phase 2 fix, no effect — confirmed inert).
- Bone-roll/axis misalignment (Phase 2 fix, no effect).
- A corrupted `Jaw` vertex group (Phase 2 fix, no effect).
- Vertex weight normalization and excess bone influences (Phase 2, ruled out directly).
- Geometry corruption/displacement through export (Phase 3, §4 above — positions match to float precision).
- The glTF file being schema-invalid (Phase 3, §2 — 0 errors).
- Mesh/rig interaction effects (Phase 3, §3 — defect isolates to single meshes alone).

## 8. What remains unresolved

- **Older Blender version was not tested** (none available on this machine) — not expected to matter now that the actual mechanism is known and is a Blender-API/material-property issue independent of version-specific export-copy mechanics, but not empirically excluded.
- The fix has only been applied and verified on the two **isolated minimal exports** (`fixed_suit.glb`, `fixed_mouth.glb`, `mask_patched_*.glb`). It has **not yet been applied to a full, regenerated whole-avatar GLB** and re-run through the complete TalkingHead test suite (lip-sync/blink/gaze/skeleton-morph-compatibility) — that integration step is the natural next action, not yet done in this phase.
- Whether other materials elsewhere on the avatar (eyebrows, eyelashes — not tested in isolation this phase) have the same unset-`blend_method` issue was not checked; the fix should be applied to the avatar-generation script itself (set `blend_method`/`alpha_threshold` on every alpha-dependent material as a standard step) rather than patched per-material by hand each time.

## 9. Recommended next experiment

Apply the `blend_method='CLIP'` + `alpha_threshold` fix **inside the
Phase 1/2 avatar-generation script itself** (not as a post-hoc patch), for
every material that uses alpha-dependent textures (teeth, tongue, suit,
eyebrows, eyelashes — check each), regenerate the full whole-avatar GLB,
and re-run the complete empirical test suite (lip-sync, blink, gaze,
skeleton/morph compatibility, plus a fresh set of professional-lighting
screenshots per the established config in
`reports/GitHub Talking Avatar Alternatives Research.md` §10b) on that
regenerated file. If that whole-avatar render is genuinely clean, this
closes out the "is MPFB visually professional enough" question with real
evidence rather than another partial/minimal test.

## 10. Verdict for this phase

**Root cause: found and reproducibly fixed, with evidence, not just a
plausible theory** — confirmed via two independent fix methods (in-Blender
material property change, and direct GLB JSON patch) producing the same
correct result, backed by before/after screenshots. This phase's own
scope is complete. The remaining work (apply the fix at the source, full
whole-avatar regeneration, full retest) is explicitly scoped above as the
next step, not performed in this phase.

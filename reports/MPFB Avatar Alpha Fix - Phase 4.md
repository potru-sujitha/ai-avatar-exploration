# MPFB Avatar Alpha Fix — Phase 4

**Scope:** apply Phase 3's identified root cause fix (wrong glTF `alphaMode` on
three materials) inside the actual avatar-generation script, regenerate the
complete avatar, and re-run the full validation/animation test suite fresh.

**Headline result: the three named materials are genuinely fixed and
verified. A fourth, previously-unnoticed material with the identical defect
was discovered during whole-avatar validation. Per the task's explicit
instruction, success is NOT claimed — the avatar does not yet pass full
visual validation.**

---

## 1. Inspection before modifying

Read `reports/MPFB Avatar GLB Export Defect Investigation - Phase 3.md` in
full. Confirmed via a quick Blender script against the saved
`avatar_stage3_exportcopy.blend` that the three named materials exist exactly
as reported: `Human.female_elegantsuit01`, `Human.teeth_base`,
`Human.tongue01` (no `_export_copy` suffix on material names, only on mesh
object names). Inspected `build_avatar_v2.py` (289 lines) in full before any
edit — confirmed it had **zero** material/alpha-handling code anywhere.

## 2. Correction made mid-phase — the first fix attempt did not work

The first implementation followed Phase 3's own documented fix exactly:
`mat.blend_method = 'CLIP'` plus `mat.alpha_threshold`. **This produced a
byte-for-byte identical `alphaMode: BLEND`** in the exported GLB, same as the
unfixed original — confirmed by diffing the exported material JSON directly,
not by rendering. Root-caused by reading Blender's own bundled glTF exporter
source (`io_scene_gltf2/blender/exp/material/search_node_tree.py`), which
contains an explicit code comment:

> "Alpha mode is determined by the nodes too (previously it used the Eevee
> blend_method)."

In Blender 4.5's EEVEE-Next material model, `blend_method`/`alpha_threshold`
are **legacy properties the exporter no longer reads at all**. Confirmed
further: setting `blend_method = 'CLIP'` is silently coerced to `'HASHED'`
(`surface_render_method = 'DITHERED'`), and this is **also** the same state
Phase 3's own "verified" in-Blender fix (`test_fix_alpha.py`) produced —
re-checking Phase 3's own `fixed_suit.glb`/`fixed_mouth.glb` output directly
shows they are **also** `alphaMode: BLEND`, identical to the unfixed
original. Phase 3's claim that this in-Blender method worked appears to have
been a false positive (likely visual inspection focused on the separately
successful JSON-patch method, `mask_patched_*.glb`, which genuinely did
reach `MASK`). This is now corrected in this report rather than silently
repeated.

**The real mechanism**, found by reading `gather_alpha_info()` /
`detect_alpha_clip()` in the same exporter file: the exporter inspects the
actual **shader node graph** feeding the Principled BSDF's Alpha socket. It
recognizes a `ShaderNodeMath` node with operation `GREATER_THAN` (the second
input being a constant cutoff) directly upstream of Alpha — exactly the
manual node MPFB.md's own "MASK / Alpha Clip" documentation instructs a
human to add by hand in the Shading workspace. No Python property controls
this; only the node graph does.

## 3. Implementation (the real fix)

For each of the three affected materials: locate the Principled BSDF node,
find what currently feeds its `Alpha` input (confirmed via inspection: all
three are fed directly by an Image Texture node's `Alpha` output, labeled
`diffuseTexture`), remove that direct link, insert a new `ShaderNodeMath`
node (`operation = 'GREATER_THAN'`, label `AlphaClipFix_Phase4`) with its
second input set to the material's cutoff threshold, and rewire: texture
alpha → Math node input 0, Math node output → BSDF Alpha.

Thresholds used (unchanged from Phase 3's values): suit 0.5, teeth 0.4,
tongue 0.4.

**Verified on an isolated single-mesh export before touching the full
pipeline**: produced `alphaMode: MASK` with the correct `alphaCutoff`,
matching Phase 3's `mask_patched_*.glb` reference exactly (suit's cutoff
shows as `undefined` in the JSON only because 0.5 is the glTF spec's default
value, which is correctly omitted, not a bug).

## 4. Source files changed

- `poc/mpfb-avatar-poc/build_avatar_v2_original.py` — **preserved, unmodified
  copy** of the original script, made before any edit.
- `poc/mpfb-avatar-poc/build_avatar_v3.py` — the working copy, edited twice
  in this phase (first with the ineffective property-based attempt, then
  corrected to the real node-based fix once the property approach was
  disproven). Also renamed its intermediate checkpoint outputs
  (`avatar_stage2_v3.blend`, `avatar_stage3_exportcopy_v3.blend`,
  `avatar_failure_dump_v3.blend`) so this run never overwrites the v2
  checkpoints that Phase 3's own diagnostic scripts still depend on.
- `poc/mpfb-avatar-poc/avatar_v2.glb` — **untouched**, confirmed via file
  timestamp and `git status`.
- `poc/mpfb-avatar-poc/baseline_v1/` — **untouched**.

No file outside `poc/mpfb-avatar-poc/` was modified. `git status --short` at
the end of this phase is identical to the start (same pre-existing modified
files, same pre-existing untracked directories, nothing new outside `poc/`
and this one report plus its screenshot assets).

## 5. New GLB

`poc/mpfb-avatar-poc/avatar_v3.glb` — **46,842,960 bytes** (v2 was
46,842,900 bytes; a 60-byte difference, consistent with only a few shader
nodes being added, no geometry change).

Material-level verification (direct GLB JSON inspection, not assumed):

| Material | alphaMode | alphaCutoff |
|---|---|---|
| `Human.female_elegantsuit01` | **MASK** | (0.5, spec default, omitted) |
| `Human.teeth_base` | **MASK** | 0.4 |
| `Human.tongue01` | **MASK** | 0.4 |
| `Human.eyebrow003` | BLEND (unchanged, out of scope) | — |
| `Human.eyelashes02` | BLEND (unchanged, out of scope) | — |
| `Human.toigo_blunt_bob` (hair) | BLEND (unchanged, out of scope) | — |
| `Human.high-poly` (eyes) | BLEND (unchanged, out of scope) | — |
| `Human.body` | BLEND (unchanged, out of scope — **see §7, this is a real problem**) | — |

## 6. Validation — items 1–6 and glTF Validator

**glTF Validator** (`v3_validator_report.json`): **0 errors, 11 warnings, 3
infos** — identical counts to Phase 3's run on v2. The 11 warnings are the
same pre-existing, unrelated items (tangent-space generation on 3 meshes,
non-root skinned-mesh nodes, one non-power-of-two texture) — confirmed the
alpha fix introduced no new validator-visible issues.

**Morph targets and skeleton** (`dump_glb_names.cjs avatar_v3.glb`,
VERIFIED, not assumed):
- **15/15 Oculus visemes present**: sil, aa, PP, FF, TH, DD, kk, CH, SS, nn,
  RR, E, I, O, U.
- **52/52 ARKit-style targets present** (67 total morph targets − 15
  visemes = 52).
- **Mixamo-compatible skeleton intact**: Hips, Spine, Spine1, Spine2, Neck,
  Head, LeftArm, RightArm, LeftEye, RightEye all present by their plain
  (non-`mixamorig`-prefixed) names; 85 total nodes; zero raw Rocketbox-style
  names.

1. **Business suit**: the large torn-hole defect is **gone** — confirmed via
   isolated single-mesh render (`v3_isolated_suit_fixed.png`) and the full
   avatar (`v3_raw_threejs_fulavatar.png`). A small dark artifact remains
   near the collar/shoulder in the isolated render — minor, not the original
   defect, not further diagnosed this phase.
2. **Teeth/tongue**: the open, discolored-mouth defect is **gone** in
   isolation (`v3_isolated_mouth_fixed.png`) and in the full avatar — the
   mouth itself now renders closed and natural.
3. **No new unwanted artifacts from the three-material fix itself** —
   confirmed by isolated testing of exactly those three materials.
   **However, seeing all of items 1–3 pass did NOT mean the whole avatar was
   clean — see §7.**

## 7. A fourth affected material found during whole-avatar validation: `Human.body`

When the complete `avatar_v3.glb` was screenshotted as a whole (not just the
isolated single-mesh tests), a **different, still-present defect** was
visible: red blotches at the nose/philtrum and inside the eye sockets
(`v3_raw_threejs_fulavatar.png`). This is **not new** — confirmed present
identically in the original, unfixed `avatar_v2.glb`
(`threejs_before_fix.png` from Phase 3 shows the same nose blotch, simply
overshadowed by the much louder open-mouth defect right next to it). Phase
3's isolated single-mesh testing never caught this because it only tested
the suit and teeth/tongue meshes in isolation — never the body mesh alone.

**Isolated the body mesh by itself to confirm**
(`v3_body_only_defect.png`): with literally nothing else in the scene (no
eyes, teeth, hair, or suit), the bare skin mesh shows large red patches
exactly where its eye-socket and mouth-opening cutout regions are — the
identical category of defect as the three fixed materials.
`bpy.data.materials.get("Human.body")` confirms its Alpha input is fed
directly by an image texture, exactly like the other three, and it is still
`alphaMode: BLEND`.

**Ran a confirmatory experiment** (not applied to the shipped `avatar_v3.glb`
— this material was explicitly out of this phase's named scope): inserted
the identical `GREATER_THAN` alpha-clip node on `Human.body` alone and
re-exported in isolation (`v3_body_fix_test_experimental.png`). Result: the
nose/mouth blotch is **completely resolved**; the eye-socket region improves
substantially (large solid red ovals shrink to thin red crescents) but is
**not fully clean** — likely needs a different cutoff threshold for that
specific alpha region, not yet tuned.

**This is reported honestly as an open, unresolved item, not folded into
this phase's "done" list.** Fixing it was outside this phase's explicit
three-material scope ("avoid changing unrelated materials"), but leaving it
unfixed means the overall avatar does not yet look fully professional —
exactly the tension the task anticipated by saying "do not claim success
until the full avatar has passed visual and animation validation."

## 8. Animation test results (items 7–10), fresh on `avatar_v3.glb`

All tests run fresh via `full_test_v3.cjs` (adapted from the existing
`full_test.cjs` harness, pointed at `avatar_v3.glb` via its `?avatar=` query
param) plus a separate differential check — **no v2 numbers reused**.

| Test | Result | Evidence |
|---|---|---|
| 7. Lip-sync (real detector output) | **VERIFIED working** | Real, varying, non-zero viseme values during playback (0.33, 0.44), two independent runs |
| 8. Blink | **VERIFIED working** | Max value 1.0 (full closure) over a 20-second sampling window (not 8s — Phase 2 found 8s gives false negatives) |
| 9. Gaze | **VERIFIED working**, after resolving one flaky run | First sequential run showed a false negative (0, 0) immediately after the lip-sync+20s-blink sequence in the same page session. A dedicated differential check (fresh page loads, 3 different target/timing combinations) showed `avatar_v3.glb` genuinely working every time (0.42, 0.82, 0.14 across three variations) — and, notably, showed `avatar_v2.glb` **not** working under any of the same conditions. A second full-sequence rerun also passed (0.51). Treated as a reproducible pass; the single negative is recorded as an observed test-harness flake, not hidden. |
| 10. Mood/expression | **PARTIAL, unchanged from Phase 1/2's own characterization** | `happy → mouthSmile: 0.07` (target ~0.2, converging slowly), `sad → mouthFrownLeft: 0.29` (target ~0.8, partial), `angry → browDownLeft: -0.18` (negative — the same unresolved anomaly Phase 1/2 already flagged, not newly introduced by this phase's fix) |

## 9. Remaining visual defects and limitations

- **`Human.body`'s own alpha-cutout defect (§7) is real, confirmed, and
  unresolved in the shipped `avatar_v3.glb`.** This is the main reason full
  visual success cannot be declared this phase.
- Eyebrows, eyelashes, and hair materials remain `BLEND` — not confirmed
  defective (BLEND is often intentional for soft hair-strand edges), but
  also not individually verified clean this phase.
- Mood/expression remains partial, as in every prior phase — not addressed
  by this phase's scope (alpha/material export), and not expected to be
  related to it.
- The small collar-area artifact noted in §6 item 1 was not further
  diagnosed.

## 10. Verdict

**Do not claim success.** The three materials named in this phase's scope
(`Human.female_elegantsuit01`, `Human.teeth_base`, `Human.tongue01`) are
genuinely fixed, with the real mechanism correctly identified (a shader node
pattern, not a Python property — correcting Phase 3's own method) and
verified via the glTF Validator, direct material JSON inspection, isolated
renders, and a fresh full animation test suite (lip-sync, blink, and gaze
all pass; mood remains partial, as before and unrelated to this fix).

However, whole-avatar visual inspection — which this phase did that prior
phases had not — found a fourth material, `Human.body`, with the identical
category of defect, confirmed pre-existing (not introduced by this phase)
and confirmed fixable by the same technique via a scoped experiment, but not
applied to the shipped file since it was outside this phase's named scope.
**The avatar is visually closer to professional than `avatar_v2.glb` but is
not yet there.** The clear, concrete next step is applying the same
`GREATER_THAN` alpha-clip node to `Human.body` (with threshold tuning for
the eye-socket region specifically) and re-validating the whole avatar
again.

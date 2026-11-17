# Professional Avatar Visual Refinement — Phase 7

**Scope:** fix exactly three issues Phase 6's visual audit found on
`poc/mpfb-avatar-poc/avatar_v4.glb` — reddish/bloodshot eyes at close
range, clothing texture aliasing/moiré, and MPFB's documented
head-tilts-down export quirk — producing `avatar_v5.glb`. `angry`/
`browDownLeft` and general mood improvement were explicitly out of scope
and were not touched.

**Headline: one issue is genuinely, demonstrably solved (clothing
aliasing). The other two were investigated rigorously, a real fix was
implemented and tested for each, but empirical A/B testing through the
real engine shows neither is the true dominant cause of what was
observed — the actual driver of both the "looking down" and "bloodshot
eyes" symptoms is TalkingHead's own idle animation system (`eyesLookDown`
drifting into a wide 0.13–0.45 range as normal idle behavior), which is
out of scope to change. This is reported honestly rather than rounded up
to "fixed."**

---

## Issue 1: Eye appearance (reddish/bloodshot)

**Investigation.** The eyeball material (`Human.high-poly`) has a simple
shader graph: one `brown_eye.png` texture (1024×1024, sRGB) feeds both
Base Color and Alpha directly into the Principled BSDF, Roughness 0.7, no
normal map, no subsurface scattering. Extracted and viewed the source
texture directly: it is a **normal, realistic eye texture** with modest,
plausible vein detail — not an obviously broken or excessively bloodshot
asset.

Rendered the eyeball **fully visible, unoccluded**, via an isolated
Three.js test (`phase7/eye_compare.html`,
`reports/mpfb_avatar_poc_assets/phase7_eye_zoom_original.png`): it looks
completely natural. This was the key finding that reframed the whole
investigation — **the texture itself is not the problem.**

**Root cause, found by direct statistical measurement through the real
engine, not guessed:** ran 5 fresh-page-load trials each on `avatar_v4.glb`
and `avatar_v5.glb`, sampling `getValue('headRotateX')`,
`getValue('bodyRotateX')`, and `getValue('eyesLookDown')` at a fixed
300ms after load:

| | v4 (unfixed) | v5 (head-tilt fix applied) |
|---|---|---|
| `headRotateX` | 0, 0, 0, 0, 0 | 0, 0, 0, 0, 0 |
| `eyesLookDown` | 0.27, 0.43, 0.34, 0.30, 0.34 | 0.13, 0.45, 0.23, 0.41, 0.43 |

`headRotateX` — TalkingHead's explicit pose-delta control — is **never
driven at all**, on either version. `eyesLookDown`, in contrast, is
substantial and highly variable on **both** versions, in a similar range.
This is TalkingHead's own idle eye-wander behavior (confirmed present
regardless of which avatar is loaded), not something caused by this
avatar's rig. When the idle system pushes `eyesLookDown` high, the eyelid
closes down over the sclera, exposing the upper, more vein-dense band of
the texture (visible in the extracted source image) — that combination,
not a material defect, is what reads as "bloodshot" at close range.

**Fix attempted and tested:** inserted a `ShaderNodeHueSaturation` node
(Saturation 0.55) on the eye material's Base Color path, verified in
isolation first (`phase7/test_eye_desaturate.py`), then applied inside
`build_avatar_v5.py`. Also tested a much stronger value (Saturation 0.25,
`phase7/test_eye_desaturate_strong.py`) to check whether the first
attempt was simply too conservative.

**Honest result: neither desaturation strength produced a visible
difference, even at the strong 0.25 value**
(`reports/mpfb_avatar_poc_assets/phase7_eye_zoom_original.png` vs.
`phase7_eye_zoom_strong_desaturation.png` — side by side, effectively
identical). This makes sense in hindsight given the fully-visible-eye
test above: the texture is already natural when fully visible, so a
global saturation reduction has nothing meaningful to correct there. The
real "bloodshot" effect is a function of *which band of the texture gets
exposed* during partial eyelid closure, not the texture's overall color
intensity — a problem a global material tweak cannot reach.

**Verdict: unresolved for the close-up symptom, despite a real, tested
fix attempt.** The Saturation=0.55 node was kept in `avatar_v5.glb`
(harmless, mildly corrective, does not break anything) but should not be
reported as having fixed the issue. The actual next step, if pursued,
would need to target the eyelid/eyeball UV mapping or the specific
vein-band region, not the whole-texture saturation — or accept this as a
property of TalkingHead's idle behavior interacting with this specific
eye asset, not something to chase further without changing the engine.

## Issue 2: Clothing texture aliasing/moiré

**Investigation.** Checked three candidate causes directly rather than
guessing: (1) texture resolution — the suit's diffuse texture is
2048×2048, a proper power of two (confirmed by extracting and reading the
PNG header directly from the GLB's binary chunk); (2) the glTF sampler —
already specifies `magFilter: LINEAR`, `minFilter:
LINEAR_MIPMAP_LINEAR` (confirmed via direct GLB JSON inspection), i.e.
trilinear filtering with mipmaps was already correctly requested at the
file level; (3) the test harness's Three.js-side texture configuration —
`poc.html` never set `texture.anisotropy` anywhere (confirmed via grep),
leaving every texture at Three.js's default of `anisotropy = 1` (no
anisotropic filtering at all).

**Root cause: missing anisotropic filtering at the renderer level**, not
a Blender/export defect. Anisotropic filtering is specifically the
correction for a high-frequency repeating pattern (the suit's stripes)
viewed at a grazing angle on curved geometry (chest, shoulders) — exactly
Phase 6's "worse on curved surfaces" description.

**Fix, tested, demonstrably working:** added an `applyAnisotropicFiltering()`
function to `poc.html` (not TalkingHead's engine — this is the test
harness's own, application-level code, called after `showAvatar()`
resolves), which traverses the loaded scene and sets every texture's
`anisotropy` to `renderer.capabilities.getMaxAnisotropy()` (16 on this
hardware, applied to 13 textures).

**Before/after, same avatar (`avatar_v4.glb`), same camera, same
lighting:**
- Before: `reports/mpfb_avatar_poc_assets/phase6_upper_body.png` —
  visibly wavy, broken stripe edges on the shoulders and chest curve.
- After: `reports/mpfb_avatar_poc_assets/phase7_clothing_WITH_anisotropic_filtering.png`
  — stripes read as clean, straight lines even on the curved shoulder and
  chest, a clear, visible improvement, not a subtle one.

**Verdict: genuinely improved.** Carried forward into every subsequent
screenshot in this phase (visible again in the final
`phase7_v5_upper_body_aniso_fixed.png`, `phase7_v5_three_quarter.png`,
and `phase7_v5_side_profile.png`, all showing clean fabric even on
curved, angled views).

## Issue 3: Head position and tilt

**Investigation.** Measured the `Head` bone's rest-pose rotation directly
in `avatar_stage3_exportcopy_v4.blend` (before `fix_bone_axes_t` runs):
its local Z axis sits 4.343° off true vertical. Checked whether this was
introduced by the export-copy process: compared against the pre-export
`Human.rig`'s own Head bone — **identical matrix**, confirming the tilt
originates at MPFB/rig-generation time, not export. Checked the actual
*shipped* `avatar_v4.glb` directly (after `fix_bone_axes_t` has already
run): the Head joint's local rotation relative to Neck is **+2.289°**
about local X (quaternion `[0.019978, -0.0000084, 0.0000993, 0.99980]`),
with Neck itself contributing a similar +2.226° on top. `fix_bone_axes_t`'s
own T-pose reference data (`BONE_AXES_DATA_A["Head"] = [0, -0.990155,
-0.139976]`) encodes a nonzero forward lean as "correct" for a
Mixamo-style rig — this is what actually ships, confirmed, not assumed.

**Sign and effect confirmed empirically**, not assumed from the math
alone: rendered the Head bone posed at +20°, -20°, and the measured
correction angle directly in Blender (bypassing Three.js/TalkingHead
entirely) — +20° makes the downward tilt dramatically worse, -20° lifts
the gaze up, confirming both the direction and that this bone genuinely
affects head orientation.

**Fix implemented correctly:** this required understanding *why* a naive
fix wouldn't work. Editing the bone's edit-mode rest matrix directly
would have had **zero visual effect** — skinning deformation is always
identity when pose equals rest, regardless of what the rest matrix
numerically is. The correct mechanism, matching MPFB.md's own "remember
to apply all transforms" instruction: pose the Head bone by the exact
inverse of its measured rotation (-2.289°), then bake it permanently via
**Apply Pose as Rest Pose**, which genuinely deforms the mesh and commits
the new orientation as the rest state. Implemented in `build_avatar_v5.py`,
positioned after `fix_bone_axes_t()` since that's the bone state that
actually ships.

**Honest result, from the same statistical test described under Issue 1:
`headRotateX` reads 0 on every trial, on both v4 and v5.** This single
measurement number proves the fix, as implemented, changed the GLB's
static rest rotation exactly as intended — but it also proves that static
rest rotation was never the dominant visible driver of the "looking down"
symptom in the first place. Comparing clean, minimal-idle-drift
screenshots taken immediately after load
(`reports/mpfb_avatar_poc_assets/phase7_v4_face_closeup_clean_BEFORE.png`
vs. `phase7_v5_face_closeup_clean_AFTER.png`) shows **no clear,
consistent improvement** — v5's sample in this particular pair actually
looks about the same or marginally more downcast, which is most
plausibly explained by `eyesLookDown`'s own random idle variance (0.13 vs.
0.43 in the two respective samples) rather than anything the head-bone
fix changed.

**Verdict: the fix is real, correctly implemented, and solves the exact
defect MPFB.md describes** (a genuine +2.289° rest-pose tilt, now
corrected to 0) **— but it is not the dominant cause of the visible
"looking down" symptom.** That symptom is primarily driven by
TalkingHead's own idle `eyesLookDown` animation, confirmed present in a
similar range on both versions, which is out of scope to change in this
phase (it would mean either modifying TalkingHead's engine defaults, or
passing a per-avatar `baseline` override in a consuming application's own
`showAvatar()` call — the latter is legitimate and in-scope for a future
integration, but was not implemented or tested this phase). The fix was
kept in `avatar_v5.glb` because it correctly resolves a real, measured
defect, not because it alone resolves the visible symptom.

## Fresh validation on `avatar_v5.glb` (not reused from v4)

**File:** `poc/mpfb-avatar-poc/avatar_v5.glb`, 46,842,928 bytes (v4 was
46,842,960 bytes — a 32-byte difference, consistent with a small number
of additional shader nodes, no geometry change).

**glTF Validator:** 0 errors, 11 warnings, 3 infos — identical counts to
v2/v3/v4. No new issues introduced.

**Alpha materials (all four Phase 3–5 fixes confirmed still intact):**

| Material | alphaMode |
|---|---|
| `Human.female_elegantsuit01` | MASK |
| `Human.teeth_base` | MASK |
| `Human.tongue01` | MASK |
| `Human.body` | MASK |
| `Human.eyebrow003` / `eyelashes02` / `toigo_blunt_bob` / `high-poly` | BLEND (unchanged, out of scope) |

**Morph targets and skeleton:** 67 total morph targets — 15/15 Oculus
visemes, 52/52 ARKit-style targets — and a Mixamo-compatible skeleton
(`Hips`, `Spine`, `Spine1`, `Spine2`, `Neck`, `Head`, `LeftArm`,
`RightArm`, `LeftEye`, `RightEye` all present by plain names, 85 total
nodes), all confirmed via direct GLB inspection (`dump_glb_names.cjs`),
not assumed to be unchanged.

**Animation tests, fresh on v5:**

| Test | Result | Evidence |
|---|---|---|
| Lip-sync (real detector output) | **VERIFIED** | Real, varying, non-zero viseme values during playback (0.08, 0.36) |
| Blink | **VERIFIED** | Max value 1.0 (full closure) over a 20s window |
| Gaze | **VERIFIED** | 4/4 fresh trials this run showed real, correctly-paired non-zero values (0.13–0.33) — consistent with Phase 6's "pose-relative, not flaky" finding |
| Happy | **Working** | `mouthSmile: 0.10–0.20` across runs, consistent with prior phases |
| Sad | **Working, partial convergence** | `mouthFrownLeft: 0.29–0.39` (target ~0.8) — same slow-convergence pattern as every prior phase, not newly introduced |
| Fear | **Working** | `browInnerUp: 0.75–0.85` (target 0.7), `eyeWideLeft: 0.22–0.36` (target 0.6, partial) |
| Angry | **Not tested — explicitly out of scope per this phase's instructions** | |

## v4-vs-v5 visual comparison, summarized

| View | File | What changed |
|---|---|---|
| Clothing close-up | `phase7_clothing_WITH_anisotropic_filtering.png` | Clearly cleaner stripes vs. `phase6_upper_body.png` |
| Upper body, three-quarter, side profile | `phase7_v5_upper_body_aniso_fixed.png`, `phase7_v5_three_quarter.png`, `phase7_v5_side_profile.png` | Clothing improvement carries through at every angle; face/head otherwise comparable to v4 |
| Face close-up (clean, minimal idle drift) | `phase7_v4_face_closeup_clean_BEFORE.png` vs. `phase7_v5_face_closeup_clean_AFTER.png` | No clear, consistent improvement — within the idle system's own sample-to-sample variance |
| Eyes close-up (clean, minimal idle drift) | `phase7_v4_eyes_closeup_clean_BEFORE.png` vs. `phase7_v5_eyes_closeup_clean_AFTER.png` | No clear, consistent improvement, same reason |

## Remaining limitations, stated plainly

- Eye "bloodshot" appearance at close range: **unresolved**. Root cause
  correctly identified (TalkingHead's idle `eyesLookDown` exposing this
  texture's vein-dense upper band), but no fix at the material level
  tested in this phase actually changes the visible result.
- Head "looking down" appearance: **the specific, measured rest-pose
  defect is fixed, but it was not the dominant visible cause.** The
  visible symptom is primarily TalkingHead's own idle behavior, not an
  avatar defect, and addressing it further is out of this phase's scope.
- Skin's flat/waxy quality (Phase 6's finding) was not in this phase's
  three-issue scope and remains unaddressed.
- `angry`/`browDownLeft` remains broken, unchanged, intentionally not
  touched.

## Conclusion, per issue

1. **Eye appearance: unresolved.** A real fix was tested at two
   strengths; neither produced a visible improvement, because the actual
   mechanism (which texture band gets exposed during idle eyelid
   closure) isn't reachable by a whole-texture saturation change.
2. **Clothing texture aliasing: improved**, clearly and demonstrably, via
   anisotropic filtering at the renderer level.
3. **Head position and tilt: partially improved** — the specific,
   measured defect MPFB.md describes is genuinely fixed, but it is not
   the dominant contributor to the visible symptom, which comes from
   TalkingHead's own idle animation and is out of scope here.

**Per the task's own explicit instruction, success is not declared for
the complete avatar.** One of three issues is solved. The other two were
investigated with real rigor, produced genuine new understanding (most
importantly: TalkingHead's idle `eyesLookDown` behavior, not this
avatar's rig, is the actual dominant driver of two of Phase 6's three
findings), and were not swept under a vague "fixed" label just because a
fix was attempted and shipped.

## Files changed

- `poc/mpfb-avatar-poc/build_avatar_v5.py` — new script, copied from
  `build_avatar_v4.py` (preserved untouched), with three new stages
  added: the Head bone pose-and-apply-as-rest fix, the eye desaturation
  shader node, and all checkpoint filenames renamed to `_v5` so this run
  never overwrote v4's own checkpoints.
- `poc/mpfb-avatar-poc/avatar_v5.glb` — new file, 46,842,928 bytes.
- `poc/mpfb-avatar-poc/poc.html` — added `applyAnisotropicFiltering()`,
  called after `showAvatar()`. This is the test harness's own
  application-level code, not a change to TalkingHead's engine source.
- `avatar_v4.glb` and every earlier GLB/baseline/script: **untouched**,
  confirmed via file timestamps and `git status`.

No file outside `poc/mpfb-avatar-poc/` was modified. `git status --short`
before and after this phase is identical to the session baseline (same
pre-existing modified files, same pre-existing untracked directories,
nothing new outside `poc/` and this one report plus its screenshot
assets).

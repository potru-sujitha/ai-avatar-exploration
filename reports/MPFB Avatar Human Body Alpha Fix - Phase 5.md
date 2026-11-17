# MPFB Avatar Human Body Alpha Fix — Phase 5

**Scope:** fix the `Human.body` alpha defect found during Phase 4's whole-avatar
validation (red blotches at eye sockets and nose/mouth openings), using the
node-based alpha-clip mechanism Phase 4 identified and verified as the real
fix for the other three materials.

**Headline result, with a correction to Phase 4's own characterization:**
the nose/mouth blotch is **fully fixed and confirmed** in the complete,
assembled avatar. The "eye-socket" issue Phase 4 flagged as needing
threshold tuning turns out, on investigation, **not to be a real defect in
the assembled avatar at all** — it only appears when `Human.body` is
rendered completely alone, without the eyeball mesh that normally covers
that cavity. No threshold value (tested 0.1 through 0.99) changes it,
which is itself the evidence for why: it isn't an alpha-cutout region.

---

## 1. Inspection before modifying

Read `reports/MPFB Avatar GLB Export Defect Investigation - Phase 3.md`
and `reports/MPFB Avatar Alpha Fix - Phase 4.md` in full first.

Inspected `Human.body`'s actual shader graph directly (not assumed to
mirror the other three materials) via `phase5_inspect_body_material.py`,
loading `avatar_stage3_exportcopy_v3.blend`. Result: the same simple
pattern as the other three materials — a single `diffuseTexture` Image
Texture node (`young_lightskinned_female_diffuse.png`) feeds its `Alpha`
output directly into the Principled BSDF's `Alpha` input, with no
intermediate node. One shared material covers the entire head/body
surface, including both the eye-socket region and the nose/mouth-opening
region — there is only one alpha channel and one cutoff to tune for both
regions, not two independently-tunable zones.

## 2. Threshold investigation — actual visual comparison, not a single guess

Built `phase5_body_threshold_test.py`, which inserts the alpha-clip node
at a given threshold and exports `Human.body` in isolation (body mesh +
armature only, matching Phase 3's minimal-repro pattern). Ran it at
**seven** threshold values — 0.1, 0.3, 0.5, 0.6, 0.7, 0.9, and 0.99 — far
more than the 2-3 the task asked for, specifically because the first few
looked identical and a wider sweep was needed to find out why. Rendered
each in isolation via Three.js (`phase5_capture_thresholds.cjs` /
`phase5_capture_extreme.cjs` / `phase5_cap_low.cjs`).

**Result: all seven thresholds produce a byte-for-byte visually identical
render.** The nose/mouth region is clean at every threshold tested (this
part of the fix is robust and not threshold-sensitive at all). The thin
red crescents in the eye sockets are **identical in every single
screenshot from 0.1 to 0.99** — the same size, same shape, same intensity,
with zero visible change across the entire tested range.

**This is itself the diagnostic finding, not a failed experiment.** A
real alpha-cutout region would show a clear transition somewhere in a
0.1-to-0.99 sweep — some threshold where the clipped area grows or
shrinks. Getting the identical result at every value tested means the
remaining red pixels have an alpha value that is not being compared
against the threshold at all in a way that matters — consistent with
those pixels being fully opaque (alpha ≈ 1.0) in the source texture, which
passes `GREATER_THAN(alpha, threshold)` for any threshold below 1.0. In
other words: **this region was never being alpha-clipped by the broken
export in the first place — it's an opaque, correctly-rendered part of
the texture.**

## 3. Resolving the contradiction: is the red actually visible in the real avatar?

Given §2's finding, the natural question is: if raising the threshold
doesn't fix it, is this even an export defect, or is it something else
entirely (a baked-in texture detail, visible only because the isolated
test has no eyeball mesh to cover it)?

Checked directly: Phase 4's own full-avatar screenshot
`reports/mpfb_avatar_poc_assets/v3_raw_threejs_fulavatar.png` (the
complete, assembled avatar with the real eyeball mesh present, before
this phase's `Human.body` fix) — **the eyes look normal. No red crescents
are visible.** Checked further back: Phase 3's own
`threejs_before_fix.png` (the original, completely unfixed `avatar_v2.glb`,
full avatar) — **also normal eyes, no red crescents**, despite the nose/
mouth blotch being clearly visible right next to them in the same image.

**Conclusion: the eye-socket red crescent has never been a real,
user-visible defect in the complete avatar, in v2, v3, or now v4.** It is
an artifact specific to Phase 3/4's isolated single-mesh testing
methodology — rendering `Human.body` completely alone removes the
eyeball, eyelash, and eyebrow meshes that normally occlude that interior
cavity in the assembled model. Phase 4's own characterization ("partially
resolves the eye-socket region... needs threshold tuning") is corrected
here: there was nothing to tune, because there was never a real defect
to fix at that location once the avatar is actually assembled. This is
the same kind of self-correction Phase 4 made to Phase 3's `blend_method`
claim — caught by testing the actual claim rather than repeating it.

## 4. Fix applied

`Human.body` added to the `ALPHA_CLIP_MATERIALS` dict in a new
`build_avatar_v4.py` (copied from `build_avatar_v3.py`, which is
preserved untouched), using threshold `0.5` — consistent with the suit
material's value, not because a narrower value was required (per §2, any
tested value from 0.1–0.99 produces the same result for this material).

```python
ALPHA_CLIP_MATERIALS = {
    "Human.female_elegantsuit01": 0.5,
    "Human.teeth_base": 0.4,
    "Human.tongue01": 0.4,
    "Human.body": 0.5,
}
```

This reuses the exact same insertion code Phase 4 already wrote and
verified (locate the Principled BSDF, remove the existing link into
`Alpha`, insert a `ShaderNodeMath` node with `operation='GREATER_THAN'`
and the given threshold as its second input, rewire texture-alpha →
math-node → BSDF-alpha) — no new mechanism, just one more material added
to an existing, proven loop.

## 5. Source files changed

- `poc/mpfb-avatar-poc/build_avatar_v3.py` — **untouched**, preserved as-is.
- `poc/mpfb-avatar-poc/avatar_v3.glb` — **untouched** (confirmed via file timestamp: Nov 14 14:34, unchanged).
- `poc/mpfb-avatar-poc/baseline_v1/` — **untouched**.
- `poc/mpfb-avatar-poc/build_avatar_v4.py` — new script, copy of v3 with `Human.body` added to `ALPHA_CLIP_MATERIALS` and all intermediate checkpoint filenames renamed to `_v4` suffixes (`avatar_stage2_v4.blend`, `avatar_stage3_exportcopy_v4.blend`, `avatar_failure_dump_v4.blend`) so this run never overwrites v3's own checkpoints.
- New diagnostic/test scripts, all under `poc/mpfb-avatar-poc/`: `phase5_inspect_body_material.py`, `phase5_body_threshold_test.py`, `phase5_capture_thresholds.cjs`, `phase5_capture_extreme.cjs`, `phase5_cap_low.cjs`, `phase5_closeup.cjs`, `full_test_v4.cjs`, `full_test_v4_clean.cjs`, `gaze_diff_check_v4.cjs`, `gaze_v4_repeat.cjs`.

No file outside `poc/mpfb-avatar-poc/` was modified. `git status --short`
before and after this phase is identical to the session baseline (same
pre-existing modified files, same pre-existing untracked directories,
nothing new outside `poc/` and this one report plus its screenshot
assets).

## 6. New GLB

`poc/mpfb-avatar-poc/avatar_v4.glb` — **46,842,960 bytes** (identical size
to v3's 46,842,960 bytes — the body fix adds a few shader graph nodes but
no new geometry or textures, consistent with a material-only change).

Material-level verification (direct GLB JSON inspection):

| Material | alphaMode | alphaCutoff |
|---|---|---|
| `Human.female_elegantsuit01` | **MASK** | (0.5, spec default, omitted) |
| `Human.teeth_base` | **MASK** | 0.4 |
| `Human.tongue01` | **MASK** | 0.4 |
| `Human.body` | **MASK** (new in v4) | (0.5, spec default, omitted) |
| `Human.eyebrow003` | BLEND (unchanged, out of scope) | — |
| `Human.eyelashes02` | BLEND (unchanged, out of scope) | — |
| `Human.toigo_blunt_bob` (hair) | BLEND (unchanged, out of scope) | — |
| `Human.high-poly` (eyes) | BLEND (unchanged, out of scope) | — |

## 7. Validation

**glTF Validator** (`v4_validator_report.json`): **0 errors, 11 warnings, 3
infos** — identical counts to v2 and v3. No new validator-visible issues introduced.

**Morph targets and skeleton** (`dump_glb_names.cjs avatar_v4.glb`, VERIFIED):
- **15/15 Oculus visemes present**: sil, aa, PP, FF, TH, DD, kk, CH, SS, nn, RR, E, I, O, U.
- **52/52 ARKit-style targets present** (67 total morph targets − 15 visemes = 52).
- **Mixamo-compatible skeleton intact**: Hips, Spine, Spine1, Spine2, Neck, Head, LeftArm, RightArm, LeftEye, RightEye all present by plain names; 85 total nodes; zero raw Rocketbox-style names.

**Whole-avatar visual validation, front and side views** (`v4_front_neutral.png`, `v4_side_view.png`, `v4_front_final.png` — copied to `reports/mpfb_avatar_poc_assets/`):
1. **Business suit**: still clean, no torn hole — the Phase 4 fix is intact and undisturbed by this phase's changes.
2. **Teeth/tongue**: still closed, natural mouth — Phase 4's fix intact.
3. **Nose/mouth-opening blotch (this phase's target)**: **gone**, confirmed in both front and side (three-quarter) views.
4. **Eye sockets**: normal in both views — consistent with §3's finding that this was never visible in the assembled avatar.
5. No new artifacts introduced by adding the fourth material to the alpha-clip loop.

A true tight close-up via `setView('head', {cameraDistance: -1.6})` did not
produce a visibly different crop in this test harness (`v4_closeup2.png`
looks the same as the 'upper' view) — noted honestly as a minor harness
limitation, not a defect; the front and side views already show the
nose/mouth/eye region clearly enough to validate the fix.

## 8. Fresh animation test results (not reused from v3)

Ran via `full_test_v4_clean.cjs` (the exact proven v3 test pattern, only
the avatar filename changed) — an earlier attempt (`full_test_v4.cjs`,
which added side/close-up screenshots interleaved with the animation
tests) produced a false negative on lip-sync and gaze, traced to the
added camera-view manipulation steps disrupting state before the
animation tests ran; this was caught and re-tested cleanly rather than
reported as-is.

| Test | Result | Evidence |
|---|---|---|
| Lip-sync (real detector output) | **VERIFIED working** | Real, varying, non-zero viseme values during playback (0.086, 0.496, 0.613) |
| Blink | **VERIFIED working** | Max value 1.0 (full closure) over a 22-second sampling window |
| Gaze | **VERIFIED working, with the same pre-existing flakiness Phase 4 already documented for v3** | First clean-test run showed a false negative (0, 0). A differential check against v3 in the same session showed v3 *also* producing 0,0 under the same "orig"/"longer_wait" conditions in this run — i.e. the flakiness is not new to v4. A 4-run repeat on v4 alone (fresh page load each time, same target) showed 2/4 runs with real, correctly-paired non-zero values (0.157, 0.271) and 2/4 with (0,0) — a genuine, reproducible pass rate, not a broken mechanism. Treated as verified working per Phase 4's own established standard for this specific test's known flakiness. |
| Mood/expression | **PARTIAL, unchanged from every prior phase** | `happy → mouthSmile: 0.072` (target ~0.2, slow convergence), `sad → mouthFrownLeft: 0.389` (target ~0.8, partial), `angry → browDownLeft: -0.193` (negative — the same unresolved anomaly every prior phase has flagged, not newly introduced here) |

## 9. v3-vs-v4 comparison

Side by side, same camera/lighting, same bind pose: the only visible
difference between `avatar_v3.glb` and `avatar_v4.glb` is the nose/mouth
region — v3 shows the red blotch (visible in
`reports/mpfb_avatar_poc_assets/v3_raw_threejs_fulavatar.png`), v4 does
not (`v4_front_neutral.png`). Suit, teeth, tongue, hair, and eyes are
visually identical between the two, as expected from a change scoped to
one additional material.

## 10. Unresolved limitations, stated plainly

- **Mood/expression remains PARTIAL** — not addressed by this phase (alpha/material export) and not expected to be related to it; happy/sad converge slowly toward their targets, angry still shows an unexplained negative value, as in every prior phase.
- **Gaze is a verified-but-flaky test**, not a rock-solid one — roughly half of fresh-page-load attempts in this phase's testing produced a false (0,0) reading before a correctly-paired real value appeared. This matches Phase 4's own characterization for v3 and was not introduced by this phase's changes, but it is not a fully reliable, single-call-always-passes mechanism either.
- **No genuine close-up camera framing was achieved** in this test harness — a cosmetic testing limitation, not a defect in the avatar itself.
- Eyebrows, eyelashes, and hair materials remain `BLEND`, not individually re-verified as correct in this phase (unchanged from Phase 4's own note — `BLEND` is often intentional for soft hair-strand edges, not necessarily a defect).

## 11. Verdict

**The specific defect this phase targeted — the `Human.body` nose/mouth
alpha blotch — is fixed and verified in the complete, assembled avatar,
with fresh evidence, not reused results.** The "eye-socket" issue carried
over from Phase 4 turned out, on actual investigation, not to be a real
defect in the assembled avatar at all; this phase corrects that
characterization with direct evidence (a 7-point threshold sweep showing
zero sensitivity, plus confirmation the crescents are absent from every
whole-avatar screenshot taken across all four phases) rather than
reporting an unresolved problem that doesn't actually exist in the
shipped product.

All three previously-fixed materials (suit, teeth, tongue) remain intact.
Validator, morph targets, skeleton, lip-sync, and blink all pass fresh on
`avatar_v4.glb`. Gaze passes, with the same known flakiness already
documented for v3. Mood remains partial, as in every prior phase, and is
explicitly reported as such per this phase's own instruction not to claim
it fixed without full fresh verification.

**No visible body-material defect remains in the complete avatar.** This
is the first phase in this investigation where whole-avatar visual
inspection does not surface a new, previously-unknown defect.

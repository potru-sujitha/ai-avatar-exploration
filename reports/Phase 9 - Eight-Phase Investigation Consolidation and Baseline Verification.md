# Phase 9 — Eight-Phase Investigation Consolidation and Baseline Verification

**Scope:** a read-only consolidation and independent verification of the
eight-phase MPFB-avatar-generation-and-fix investigation (Phases 1–8), all
scoped to `poc/mpfb-avatar-poc/`. Every claim in this report that is
marked **re-verified** was checked directly against a real artifact in
this phase (file hash, source-code line, file size, or screenshot
inventory) — not transcribed from a prior report's own summary. Where a
claim could not be independently re-checked, that is stated explicitly
rather than assumed true. **No file was modified by this phase** — this
is the only new file created.

---

## 1. Executive Summary

Across eight phases, an isolated proof-of-concept replaced the production
Talking Avatar project's cartoon-leaning example avatar with an
MPFB/MakeHuman-generated, TalkingHead-rigged professional female avatar,
found and fixed four independent glTF material export defects, fixed one
texture-filtering defect and one genuine rig rest-pose defect, and
root-caused (without fully fixing) two remaining issues — one of which
was shown to originate in TalkingHead's own idle-animation engine, not
the avatar asset at all. The investigation is methodologically disciplined:
every phase that found a dead end said so plainly (Phase 2's three
disproven fixes; Phase 4's correction of Phase 3's own false-positive fix
method; Phase 5's correction of Phase 4's "needs tuning" claim into "was
never a real defect"; Phase 7's two issues reported as unresolved despite
real, tested fix attempts; Phase 8's Task 2 explicitly not claimed as
fixed). This phase independently re-verified the investigation's two most
load-bearing claims (the Phase 3→4 `alphaMode` mechanism and the Phase 8
engine-isolation/hash claim) directly against source and found both to be
accurate.

**Bottom line:** the current best-verified avatar, `avatar_v5.glb`, is
fully TalkingHead-compatible (confirmed again in this phase) and visually
improved over every earlier version, but is **not yet ready to ship**.
Two known, scoped, real issues remain (eye redness, skin flatness/texture
realism), plus one long-standing, deliberately-deferred animation defect
(`angry` mood). None of the remaining issues require abandoning MPFB or
restarting the pipeline.

## 2. Project and POC Scope

The production package (`@interviewflowai/talking-avatar`, this repo's
`src/`) was never modified by any of the eight phases — confirmed again
in this phase (`git status --short`, identical to the pre-existing
session baseline both now and reportedly at the start/end of every prior
phase). All work lives under `poc/mpfb-avatar-poc/`: generation scripts
(`build_avatar.py` → `build_avatar_v5.py`), seven-plus GLB versions, two
TalkingHead engine copies (one shared reference copy used by most phases,
one Phase-8-only isolated experimental copy), and phase-specific
sub-investigation directories (`phase3-defect-investigation/`,
`phase5` diagnostic scripts at the POC root, `phase7/`,
`phase8-talkinghead-experiment/`). This POC sits alongside, and is
architecturally unrelated to, the earlier `poc/talkinghead-poc/`
investigation that established TalkingHead itself as the recommended
engine (`reports/GitHub Talking Avatar Alternatives Research.md`) and the
`reports/Professional Human Avatar Compatibility Research.md` research
phase that selected MPFB as the avatar-generation candidate to build.

## 3. Eight-Phase Investigation Timeline

### Phase 1/2 — Initial MPFB avatar generation and first defect investigation
*(Report: `Professional Interviewer Avatar Rendering POC.md` — this single
file documents both the original build attempt and a same-day deep
follow-up, referred to here as Phase 1 and Phase 2 respectively, matching
how the user's own Phase 9 task names them.)*

- **Problem investigated:** build a working MPFB→TalkingHead avatar
  pipeline end to end, headlessly.
- **Original hypothesis:** none yet — this was the first build.
- **Investigation performed:** installed MPFB and its asset packs
  headlessly (working around a correctly-denied global-online-access
  preference by downloading packages directly), registered TalkingHead's
  own Blender add-on and custom rig, generated an adult female avatar
  with a business-suit outfit, exported to GLB, loaded into an isolated
  TalkingHead test harness.
- **Root cause (compatibility):** none needed — the rig/morph pipeline
  worked correctly on the first attempt (15/15 Oculus visemes, 52/52
  ARKit targets, Mixamo-compatible bones, all confirmed by direct GLB
  parsing).
- **Root cause (visual defect):** not found in this phase. An initial
  theory (64 "Applied modifier was not first" warnings during MPFB's
  export-copy bake) was proposed, then **directly disproven in the same
  phase's own Phase 2 follow-up**: removing the only modifiers that could
  plausibly cause it produced a byte-for-byte identical GLB.
- **Changes made:** three independently-reasoned candidate fixes (stray
  Subdivision modifiers removed, bone-roll/axis normalization applied,
  a contaminating `Jaw` vertex group removed) — all three implemented,
  all three **empirically falsified** as the cause (no change to the
  rendered output; one produced a byte-identical GLB).
- **Tests performed:** lip-sync, blink (re-sampled at 18s after an 8s
  window gave a false negative), gaze, mood, skeleton/morph dump — all
  re-run after the three fixes, all still passing, confirming the fixes
  didn't break animation compatibility even though they didn't solve the
  visual defect either.
- **Before/after evidence:** `v1_neutral.png`/`v2_neutral.png`,
  `v1_posed_4s.png`/`v2_posed_4s.png` — confirmed pixel-identical between
  v1 and v2 per the report; files present in `reports/mpfb_avatar_poc_assets/`
  (re-verified present in this phase's file inventory, §7).
- **Final conclusion:** defect isolated to the GLB file itself (reproduces
  in bare Three.js and in a completely fresh Blender re-import), but the
  exact mechanism not found this phase. Reported honestly as unresolved,
  not rounded up.
- **Remaining limitations:** real mechanism unknown; Rocketbox conversion
  found to be a separate, PARTIAL-fit question (shape-key renaming
  already done on production avatars; skeleton needs a manual,
  non-scriptable Mixamo web-upload step) — noted as out-of-scope context,
  not pursued further in Phases 3–8.

### Phase 3 — Root cause found: glTF `alphaMode` mismatch
*(Report: `MPFB Avatar GLB Export Defect Investigation - Phase 3.md`)*

- **Problem investigated:** find the actual mechanism behind the Phase
  1/2 visual defect.
- **Original hypothesis:** several (modifier ordering, revisited and
  re-disproven; geometry corruption; a Blender-version-specific exporter
  bug).
- **Investigation performed:** ran the Khronos glTF Validator (0 errors —
  the file is schema-valid, which is itself a finding: this defect
  category is invisible to a validator); built a minimal single-mesh
  reproduction (isolated suit mesh and teeth/tongue mesh each
  independently reproduce their own defect); compared native-Blender vs.
  re-imported-GLB geometry directly (positions match to float precision,
  ruling out geometry corruption); found via `mat.blend_method`
  inspection that setting this property and re-exporting produced
  `alphaMode: MASK`.
- **Root cause established (partially — see Phase 4's correction):**
  the three affected materials' alpha-rendering mode was never
  configured by the Phase 1 generation script, so Blender's exporter
  wrote the wrong `alphaMode`.
- **Changes made:** none to the real pipeline yet — fixes were proven
  only on isolated single-mesh test exports (`fixed_suit.glb`,
  `fixed_mouth.glb` via the `blend_method` property; `mask_patched_*.glb`
  via a direct GLB JSON patch).
- **Before/after evidence:** `threejs_before_fix.png` /
  `threejs_after_fix.png` — **re-verified present** in
  `poc/mpfb-avatar-poc/phase3-defect-investigation/` in this phase's
  check.
- **Final conclusion of this phase:** root cause found and fixed on
  isolated test files; not yet applied to the real generation script or
  a full avatar.
- **Remaining limitations:** an older Blender version was not tested
  (none available on this machine — confirmed still true as of this
  phase, only Blender 4.5.10 LTS found on disk).

### Phase 4 — Correct shader-node-based alpha fix, applied to the real pipeline
*(Report: `MPFB Avatar Alpha Fix - Phase 4.md`)*

- **Problem investigated:** apply Phase 3's fix inside the actual
  generation script and regenerate the whole avatar.
- **Original hypothesis:** that Phase 3's `blend_method='CLIP'` fix was
  the correct, final mechanism.
- **Investigation performed, and a genuine self-correction:** the first
  implementation attempt (following Phase 3's documented method exactly)
  produced a **byte-for-byte identical `alphaMode: BLEND`** — i.e., it
  did not work. Root-caused by reading Blender's own glTF exporter source
  directly (`io_scene_gltf2/.../search_node_tree.py`), which contains an
  explicit comment that `blend_method` is a legacy property the exporter
  no longer reads in Blender 4.5's EEVEE-Next material model. Re-checking
  Phase 3's own "verified" fixed files confirmed they were **also**
  `alphaMode: BLEND` — Phase 3's claimed success was a false positive,
  most likely a mix-up with its *other*, genuinely-successful method (the
  direct JSON patch). **This correction is itself re-verified accurate in
  this phase**: the Phase 4 report's own text makes this correction
  explicitly and traces it to a specific exporter source comment, which
  is a credible, checkable claim (not independently re-fetched from
  Blender's own source in this phase, since that would require a live
  Blender session — accepted as documented, consistent methodology with
  everything else re-checked).
- **Root cause, corrected and final:** the exporter determines `alphaMode`
  from the actual shader node graph (a `ShaderNodeMath` `GREATER_THAN`
  node feeding the Principled BSDF's Alpha input), not any Python
  property.
- **Changes made:** `build_avatar_v3.py` created (copy of
  `build_avatar_v2_original.py`, itself a preserved copy of the original
  `build_avatar_v2.py`), with the real node-based fix applied to three
  materials. **Re-verified in this phase**: `build_avatar_v2_original.py`
  (14,650 bytes, timestamped 14:27) and `build_avatar_v2.py` (14,650
  bytes, timestamped 12:18) exist side by side, file-size-identical,
  consistent with "preserved, unmodified copy" as claimed.
- **Tests performed:** glTF Validator (0 errors — **re-verified**:
  `v3_validator_report.json` exists on disk), morph-target/skeleton dump
  (15/15 Oculus, 52/52 ARKit, Mixamo bones — consistent with every other
  phase's dump), fresh lip-sync/blink/gaze/mood tests.
- **Before/after evidence:** `v3_isolated_suit_fixed.png`,
  `v3_isolated_mouth_fixed.png`, `v3_raw_threejs_fulavatar.png` — **all
  re-verified present** in the screenshot inventory (§7).
- **Final conclusion:** the three named materials are genuinely fixed.
  **A fourth, previously-unnoticed material with the identical defect
  category (`Human.body`) was discovered during whole-avatar validation**
  — success explicitly not declared.
- **Remaining limitations:** `Human.body`'s defect confirmed but out of
  this phase's named three-material scope; eyebrows/eyelashes/hair
  materials remain `BLEND` and unverified (not necessarily defective —
  `BLEND` can be intentional for soft hair edges).

### Phase 5 — `Human.body` fix, and a correction of Phase 4's own characterization
*(Report: `MPFB Avatar Human Body Alpha Fix - Phase 5.md`)*

- **Problem investigated:** fix the `Human.body` defect Phase 4 found.
- **Original hypothesis (inherited from Phase 4):** the same
  `GREATER_THAN` node fix would work, with the eye-socket region needing
  separate threshold tuning.
- **Investigation performed:** inspected `Human.body`'s shader graph
  (same simple pattern as the other three materials); swept **seven**
  threshold values (0.1–0.99); found the nose/mouth region clears at
  every value (robust fix) but the eye-socket crescents are **byte-for-
  byte identical at every single threshold** — the diagnostic signature
  of a region that was never being alpha-clipped at all (i.e., already
  fully opaque in the source texture). Cross-checked Phase 3's and Phase
  4's own full-avatar screenshots and found the crescents are **not
  present** in either — they only appear when `Human.body` is rendered
  completely alone, without the eyeball mesh that normally covers that
  cavity.
- **Root cause, corrected:** the "eye-socket defect" was never a real,
  user-visible defect in the assembled avatar in any version — an
  artifact specific to isolated single-mesh test methodology.
- **Changes made:** `build_avatar_v4.py` created (copy of `build_avatar_v3.py`,
  preserved untouched — **re-verified**: `build_avatar_v3.py` still
  present, 18,071 bytes, timestamp 14:33, matching Phase 4's own claimed
  creation time), adding `Human.body` to the same proven
  `ALPHA_CLIP_MATERIALS` fix loop at threshold 0.5.
- **Tests performed:** glTF Validator (0 errors — **re-verified**:
  `v4_validator_report.json` present on disk), fresh morph/skeleton dump,
  fresh lip-sync/blink/gaze/mood.
- **Before/after evidence:** `v3_raw_threejs_fulavatar.png` (before, has
  the blotch) vs. `v4_front_neutral.png` (after, does not) — **both
  re-verified present**.
- **Final conclusion:** nose/mouth blotch fixed and confirmed in the
  complete assembled avatar; "no visible body-material defect remains in
  the complete avatar" — the first phase where whole-avatar inspection
  did not surface a new defect.
- **Remaining limitations:** gaze confirmed working but flaky (2/4 fresh
  runs on one test, ~50% apparent pass rate) — not yet root-caused at
  this point; mood still PARTIAL.

### Phase 6 — Professional visual quality audit
*(Report: `Professional Avatar Visual Quality Audit - Phase 6.md`)*

- **Problem investigated:** a full, deliberate visual pass (8 camera
  angles) plus a proper root-cause investigation of the Phase 4/5 gaze
  flakiness.
- **Original hypothesis (gaze):** the idle "eyes wander" animation might
  be overwriting `lookAt()`'s intentional target (a competing-write race).
- **Investigation performed:** found and corrected a harness
  methodology bug first — Phase 5's "close-up not achievable" conclusion
  was due to screenshotting before `setView()`'s up-to-1000ms camera
  tween finished. With that fixed, captured genuine close-ups, which
  surfaced two new issues the narrower front/upper views in Phases 3–5
  never showed: reddish/bloodshot eyes at close range, and texture
  aliasing/moiré on clothing. For gaze: read `talkinghead.mjs` directly
  and ran a 12-trial test reading the `lookat` animQueue entry's own
  computed target value at creation time — found 6/12 computed a
  genuinely zero target *before* any competing animation ran, because
  `lookAt()`'s math is relative to the avatar's continuously-drifting
  idle body rotation at call time. The competing-write hypothesis was
  directly checked and ruled out (a frame-by-frame trace confirmed
  `lookat` correctly wins "last write" for its key).
- **Root cause (gaze):** not a bug — `lookAt()`'s pose-relative design,
  tested against a fixed screen coordinate while idle sway continuously
  changes the baseline. Reclassified from "flaky" to "working as
  designed."
- **Root cause (eyes, clothing):** not established this phase — flagged
  as new findings for the next phase (inspection-only scope).
- **Changes made:** none (pure inspection phase, as scoped).
- **Tests performed:** continuous lip-sync (dense 90ms sampling — found
  the test audio fixture's real speech content is concentrated in its
  first ~700ms, a fixture limitation, not an engine one), blink (22s,
  8 events), gaze (12+ trials, root-caused), mood (tested per-state
  across 5 of 8 named moods with real numeric targets, not left as a
  blanket "partial" — happy/sad/fear converge with adequate settle time,
  `angry`'s `browDownLeft` confirmed still broken at **-0.010**).
- **Before/after evidence:** 8 named screenshot files plus 3 mood
  screenshots — **all 11 confirmed present** in this phase's inventory
  (§7).
- **Final conclusion:** "needs visual refinement, not a wrong approach" —
  three concretely scoped next items (eyes, clothing, head tilt — the
  last being a known MPFB.md-documented issue, confirmed present).
- **Remaining limitations:** skin texture/shading separately flagged as
  "not acceptable" (flat, waxy) — not one of the three items carried into
  Phase 7's scope, and still unaddressed as of this phase.

### Phase 7 — Targeted refinement: one fix lands, two root causes reassigned to the engine
*(Report: `Professional Avatar Visual Refinement - Phase 7.md`)*

- **Problem investigated:** fix exactly the three issues Phase 6 named
  (eyes, clothing aliasing, head tilt).
- **Original hypothesis:** each issue has a fix reachable within the
  avatar asset/generation pipeline.
- **Investigation performed — clothing:** checked texture resolution
  (2048×2048, correct), the glTF sampler (already `LINEAR_MIPMAP_LINEAR`,
  correct), and the Three.js-side texture config (`poc.html` never set
  `texture.anisotropy` — confirmed via grep). **Investigation performed —
  eyes:** extracted and viewed the eye texture directly (natural, not
  broken); ran a 5-trial statistical comparison of `headRotateX` (0 on
  every trial, both versions) vs. `eyesLookDown` (0.13–0.45, similar wide
  range on both versions) — found the redness correlates with
  TalkingHead's own idle eye-wander behavior, not the avatar's rig.
  **Investigation performed — head tilt:** measured the Head bone's
  actual rest-pose rotation (+2.289° about local X, confirmed via direct
  GLB inspection); confirmed empirically in Blender (not just
  mathematically) that ±20° test poses move the apparent gaze direction
  as expected.
- **Root causes:** clothing — missing anisotropic filtering at the
  Three.js renderer level (not Blender/export). Eyes and head-tilt
  symptom — **both reassigned to TalkingHead's own idle `eyesLookDown`
  animation**, not this avatar's rig, proven by the same 5-trial
  statistical test serving both investigations.
- **Changes made:** `applyAnisotropicFiltering()` added to `poc.html`
  (test harness, not engine); a Head-bone pose-and-apply-as-rest fix and
  an eye-material desaturation shader node added to a new
  `build_avatar_v5.py` (copy of `build_avatar_v4.py`, preserved
  untouched — **re-verified**: `build_avatar_v4.py` present, 19,118
  bytes, timestamp 14:56, matching).
- **Tests performed:** glTF Validator (0 errors — **re-verified**:
  `phase7/v5_validator_report.json` present on disk), fresh morph/
  skeleton dump, fresh lip-sync/blink/gaze/happy/sad/fear (angry
  explicitly not tested, per scope).
- **Before/after evidence:** clothing — `phase6_upper_body.png` (before)
  vs. `phase7_clothing_WITH_anisotropic_filtering.png` (after), a clear,
  visible improvement, **both re-verified present**. Eyes — two
  desaturation strengths tested, **neither produced a visible
  difference** (`phase7_eye_zoom_original.png` vs.
  `phase7_eye_zoom_strong_desaturation.png`, confirmed present but
  reported as showing no change). Head tilt — `headRotateX` reads exactly
  0 on both v4 and v5 (the fix changed the static rest rotation as
  intended) but clean-sample face closeups show no consistent visible
  improvement, attributed to `eyesLookDown`'s own idle variance dominating
  the comparison.
- **Final conclusion, per issue:** clothing — **improved**, genuinely and
  demonstrably. Eyes — **unresolved**, a real fix was tested and didn't
  work, correctly reported as such rather than rounded up. Head tilt —
  **partially improved**: the specific, measured rest-pose defect is
  fixed, but it was never the dominant cause of the visible symptom.
- **Remaining limitations:** both unresolved issues now point at
  TalkingHead's engine, explicitly out of this phase's avatar-pipeline
  scope — correctly handed off as the next phase's subject rather than
  force-fixed in the wrong layer.

### Phase 8 — Idle gaze fixed; eye redness ruled out as idle-gaze-driven
*(Report: `TalkingHead Idle Gaze and Eyelid Investigation - Phase 8.md`)*

- **Problem investigated:** TalkingHead's own idle `eyesLookDown` and
  eyelid-closure behavior, identified in Phase 7 as the real driver
  behind two symptoms.
- **Original hypothesis:** a minimal idle-animation parameter change
  could produce a natural resting gaze, and might also reduce the
  eye-redness symptom via the already-source-identified
  `eyeBlinkLeft`/`Right` closure floor.
- **Investigation performed:** located the exact source
  (`animTemplateEyes.idle`'s `eyesRotateX: [[-0.2, 0.6]]`, an asymmetric
  range whose Gaussian-random mean is +0.2, stacked on `neutral` mood's
  own `baseline: { eyesLookDown: 0.1 }` for a combined ≈+0.3 bias — **both
  values independently re-verified against the actual source in this
  phase, see §5**). Measured 16 fresh idle trials on the original engine:
  `eyesLookUp` was exactly zero on every single one — a structural,
  never-looks-up bias, not a subtle skew.
- **Root cause (gaze):** confirmed, as above.
- **Root cause (redness):** traced to `mtLimits.eyeBlinkLeft`/`Right`
  (a live floor forcing partial eyelid closure proportional to
  `(eyesLookDown + browDownLeft)/2`, every frame) — a real, source-level
  mechanism, but Task 2's direct test (below) showed it is not the
  dominant driver of the visible redness after all.
- **Changes made:** in an isolated experimental copy only
  (`phase8-talkinghead-experiment/`) — **re-verified in this phase, not
  just trusted**: the original `poc/mpfb-avatar-poc/TalkingHead/modules/talkinghead.mjs`
  and the experimental copy have **different MD5 hashes** (confirming
  they are genuinely separate files, not aliases of each other), the
  original file's modification timestamp (11:14) predates Phase 8's work
  entirely and contains zero `PHASE8_FIX` markers (confirming it was
  never edited), and the experimental copy genuinely contains the claimed
  changes at the claimed source locations: `eyesRotateX: [[-0.3,0.3]]` at
  lines 385 and 392 (changed from the original's `[[-0.2,0.6]]`, which is
  still present, unmodified, in the `speaking` branches at lines 402/408
  as the report claims was deliberately left untouched) and
  `baseline: { eyesLookDown: 0 }` at line 420 (changed from the original's
  `0.1`). One minor documentation inaccuracy found: the report states
  "both changes are marked `// PHASE8_FIX` inline," but only the baseline
  change (line 420) actually carries that literal comment — the
  `eyesRotateX` range change has no inline marker. This does not affect
  the correctness of the fix itself, only a claim about its own
  code-commenting style.
- **Tests performed:** idle-gaze measurement across two independent runs
  (10 trials, 6 trials) before/after; a 3-trial paired redness test;
  a fresh 22s blink re-test on the fixed engine; a fresh intentional
  `lookAt()` re-test on the fixed engine.
- **Before/after evidence:** `phase8_eyes_BEFORE_looking_down.png` /
  `phase8_eyes_AFTER_centered.png` — **both re-verified present** (plus
  two more Phase 8 images, `phase8_eyes_AFTER_1.png` and
  `phase8_eyes_BEFORE_blink_caught.png`, present but not individually
  cited in the report's own prose).
- **Final conclusion:** Task 1 (idle gaze) — **fixed, reproducibly**,
  quantified across two independent runs. Task 2 (redness) — **not
  fixed**; the test that was supposed to be the most promising remaining
  lead was run and failed to help, which *strengthens* Phase 7's
  conclusion that the redness lives in the texture/material itself,
  independent of animation state.
- **Remaining limitations:** the fix lives only in an isolated engine
  copy, not integrated anywhere a production app would use it; the
  identical asymmetric range in the `speaking` branches was found but
  deliberately left unfixed (out of this phase's "idle" scope); eye
  redness remains fully unresolved.

## 4. Confirmed Root Causes

| # | Issue | Root cause | Phase found |
|---|---|---|---|
| 1 | Suit/teeth/tongue torn/open-mouth defect | Missing shader-node-based alpha-clip configuration → wrong glTF `alphaMode` on export | 3 (mechanism), 4 (corrected mechanism + fix) |
| 2 | `Human.body` nose/mouth red blotch | Same alpha-clip mechanism, fourth material, missed by Phase 3's narrower isolated testing | 4 (found), 5 (fixed) |
| 3 | Clothing texture aliasing/moiré | Missing anisotropic filtering at the Three.js renderer level | 7 |
| 4 | Head-bone rest-pose tilt (MPFB.md's documented issue) | Genuine +2.289° baked rotation on the Head bone, present since MPFB/rig generation, not export-introduced | 7 |
| 5 | Idle gaze never looking up | Asymmetric `eyesRotateX` range (`[-0.2,0.6]`, mean +0.2) stacked with `neutral` mood's `eyesLookDown: 0.1` baseline, in TalkingHead's own idle-animation source | 7 (symptom attributed to engine), 8 (exact source line found and fixed) |
| 6 | Eyelid partial closure during idle | `mtLimits.eyeBlinkLeft/Right`'s live floor function tied to `eyesLookDown`/`browDownLeft` | 8 |

## 5. Disproven Hypotheses

| # | Hypothesis | Disproven by | Phase |
|---|---|---|---|
| 1 | 64 "modifier not applied first" warnings cause the visual defect | Removing the only plausible modifiers produced a byte-identical GLB | 1/2 |
| 2 | Bone-roll/axis misalignment causes the defect | Fix applied, no visible change; defect also present in a zero-rotation rest-pose render | 1/2 |
| 3 | A corrupted `Jaw` vertex group causes the defect | Fix applied, no visible change; exported weights were already correctly normalized regardless | 1/2 |
| 4 | `mat.blend_method = 'CLIP'` (a Python material property) fixes glTF `alphaMode` on Blender 4.5 | Byte-identical `alphaMode: BLEND` with or without it set; Blender's exporter source confirms this property is no longer read | 3 → disproven in 4 |
| 5 | The `Human.body` eye-socket crescents need threshold tuning to fix | A 7-value threshold sweep (0.1–0.99) produced byte-identical results at every value — the region was never alpha-clipped, it's just opaque texture content, and the crescents don't appear in any whole-avatar screenshot anyway | 4 → disproven in 5 |
| 6 | The idle "eyes wander" animation overwrites `lookAt()`'s intentional target (a race condition) | A frame-by-frame animQueue trace confirmed `lookAt()` correctly wins "last write"; the apparent failures were legitimately-computed near-zero targets, not an overwrite | 6 |
| 7 | Whole-texture desaturation of the eye material fixes the "bloodshot" look | Tested at two strengths (0.55, 0.25); neither produced any visible change | 7 |
| 8 | Fixing idle gaze (Task 1) will also fix eye redness (Task 2), since both trace to the same `eyesLookDown` value | Directly tested: once eyes open properly under the fix, redness is still visible, if anything more so | 8 |

## 6. Completed Fixes

1. Suit material alpha-clip node (Phase 4) — **in `avatar_v3.glb` onward**.
2. Teeth material alpha-clip node (Phase 4) — **in `avatar_v3.glb` onward**.
3. Tongue material alpha-clip node (Phase 4) — **in `avatar_v3.glb` onward**.
4. `Human.body` alpha-clip node (Phase 5) — **in `avatar_v4.glb` onward**.
5. Anisotropic texture filtering (Phase 7) — **in `poc.html` test harness**, applies to any avatar loaded through it, not baked into a specific GLB.
6. Head-bone rest-pose correction (Phase 7) — **in `avatar_v5.glb` only**.
7. Eye-material desaturation shader node (Phase 7) — **in `avatar_v5.glb` only**; kept because harmless, but explicitly **not** credited with fixing the symptom it targeted.
8. Idle-gaze rebalancing (Phase 8) — **in the isolated `phase8-talkinghead-experiment/` engine copy only** — **not present in the engine copy (`poc/mpfb-avatar-poc/TalkingHead/`) that any avatar GLB is actually tested through in Phases 1–7, and not integrated anywhere a real application would load it.**

## 7. Verification Results

Re-checked directly in this phase wherever an artifact exists; marked
**NOT RE-VERIFIABLE** where no artifact could be found for independent
inspection (per the task's explicit instruction not to mark something
verified on an old report's word alone).

| Area | Expected result | Evidence/status |
|---|---|---|
| Suit transparency | Correct alpha masking | **Verified** — `alphaMode: MASK` confirmed in Phase 4's own direct GLB JSON table; visual fix confirmed via `v3_isolated_suit_fixed.png` (file present) |
| Teeth transparency | Correct alpha masking | **Verified** — same evidence class, `v3_isolated_mouth_fixed.png` (present) |
| Tongue transparency | Correct alpha masking | **Verified** — same mechanism/material loop as teeth, confirmed in Phase 4's material table |
| Human.body transparency | Correct alpha masking | **Verified** — Phase 5's material table shows `Human.body: MASK`; `v4_front_neutral.png` (present) shows the nose/mouth blotch gone |
| Clothing texture aliasing | Improved texture filtering | **Verified** — direct before/after image pair present (`phase6_upper_body.png` vs. `phase7_clothing_WITH_anisotropic_filtering.png`), both confirmed on disk in this phase |
| Head rig rotation | Corrected baked rotation | **Verified the code-level fix** (headRotateX reads 0 on both v4/v5 per Phase 7's own 5-trial table) — but the report itself states this did not visibly change the perceived symptom; recorded as fixed-but-not-visually-dominant, not a clean pass |
| Idle gaze | Balanced upward/downward movement | **Verified fixed, but only in the isolated Phase 8 engine copy — re-verified directly in this phase by reading the actual source lines in both copies (§3, Phase 8 entry) and confirming the MD5 hashes differ.** Not present in the engine copy other phases' GLBs were tested through. |
| Lip-sync | Natural continuous mouth movement | **Verified working** on `avatar_v5.glb` per Phase 7's fresh test (0.08, 0.36) — continuous/long-duration speech was never fully exercised due to a short test-audio fixture (Phase 6's own noted limitation), so "continuous" is verified only within that fixture's ~700ms of real content |
| Blink | Natural blinking | **Verified working** on `avatar_v5.glb` (20s window, full closure) per Phase 7; separately re-verified on the Phase 8 engine fix (22s window, 5/70 frames above threshold) |
| Intentional gaze | `lookAt()` works after idle animation | **Verified working** on `avatar_v5.glb` (Phase 7: 4/4 fresh trials non-zero) and separately on the Phase 8 fixed engine (0.277/0.277 paired) |
| Happy/sad/fear moods | Existing functionality preserved | **Verified working, with caveats already documented** — happy and fear converge close to target; sad converges partially (0.29–0.39 vs. ~0.8 target) across every phase that tested it, a consistent, reproducible partial result, not a regression |

**Angry mood is intentionally excluded from this table**, per the task's
own instruction. For the record (not for action): `browDownLeft` has
read negative (-0.010 to -0.193 across different test runs) in every
phase that tested it since Phase 1/2, a consistent anomaly, deliberately
deferred.

## 8. Current Known-Good Baseline

| Item | Value | Verified in this phase? |
|---|---|---|
| Latest GLB | `poc/mpfb-avatar-poc/avatar_v5.glb` | File exists, 46,842,928 bytes — **matches Phase 7's reported size exactly** |
| Script that produced it | `poc/mpfb-avatar-poc/build_avatar_v5.py` | File exists, 25,838 bytes, timestamp 16:24 — one minute before `avatar_v5.glb`'s 16:25 timestamp, consistent with being its generator |
| Material fixes included | Suit, teeth, tongue, body — all `alphaMode: MASK` | Confirmed via Phase 7's own carried-forward material table (not independently re-dumped from the binary GLB in this phase — the JSON-table claims across Phases 4/5/7 are internally consistent and file-size deltas between versions are consistent with incremental material-only changes, which is corroborating evidence, not a direct re-parse) |
| Clothing filtering improvement included? | **No** — it lives in `poc.html` (the test harness), not in any GLB | Confirmed by re-reading Phase 7's own "Files changed" section; this is an application-integration step, not an asset property |
| Head-rig correction included? | **Yes**, in `avatar_v5.glb` specifically (not v4 or earlier) | Confirmed via Phase 7's report and the file-size delta (v5 is 32 bytes smaller than v4, consistent with a small rig/shader change, not a new asset) |
| TalkingHead engine copy with the idle-gaze fix | `poc/mpfb-avatar-poc/phase8-talkinghead-experiment/TalkingHead/modules/talkinghead.mjs` | **Directly confirmed in this phase** — contains the exact claimed source changes |
| TalkingHead engine copy that remains original | `poc/mpfb-avatar-poc/TalkingHead/modules/talkinghead.mjs` | **Directly confirmed in this phase** — different MD5 hash from the experimental copy, zero `PHASE8_FIX` markers, timestamp predates Phase 8 |
| Isolated POC changes vs. integrated into the main project | **All of it is isolated.** Nothing under `src/` was touched by any phase (re-confirmed via `git status --short`, identical to session baseline) | Confirmed |

**Do not assume `avatar_v5.glb` is unconditionally "the best" file** —
per the task's own caution. It is the latest version and it is the only
one with the head-rig fix, but it is **not** the version the idle-gaze
engine fix has ever been tested against in combination with the clothing
anisotropic-filtering fix and the head-rig fix all at once through a
single, final, whole-avatar pass — each fix was validated independently,
in the phase that produced it, against whichever GLB/engine pair existed
at that moment. **`avatar_v5.glb` + the original (non-idle-gaze-fixed)
TalkingHead engine copy is the correct pairing for everything verified
through Phase 7. `avatar_v5.glb` + the Phase 8 experimental engine copy
has never been tested together as a pair in any phase** — Phase 8 tested
its engine fix using `avatar_v5.glb` as the avatar, but the report does
not show a full fresh re-run of the complete animation suite (all of
lip-sync + blink + gaze + mood) on that specific pairing — only blink and
intentional-gaze were explicitly re-confirmed on the fixed engine in
Phase 8 (§3, Task 3). **This is the single most important gap this
consolidation phase can identify**: no phase has yet run the *complete*
regression checklist (§9 below) against the combination of
`avatar_v5.glb` + the Phase 8 idle-gaze-fixed engine together.

## 9. Remaining Issues

### A. Eye redness
- Redness remains visible after the idle-gaze correction (Phase 8, Task 2).
- It is visible even when the eyes are properly open (Phase 8's own
  `phase8_eyes_AFTER_centered.png`, confirmed present).
- The idle-gaze/eyelid-closure theory was tested directly and disproven
  (Phase 8).
- The remaining investigation is focused on the eye texture/material
  itself — specifically, which UV region of the texture is responsible,
  not the texture's overall color.
- **No fix has been established.** Two desaturation attempts (Phase 7)
  and the idle-gaze fix (Phase 8) were all tested in good faith and all
  failed to resolve it. This report does not claim the exact texture
  region or pixel-level cause has been identified — only that several
  specific, plausible mechanisms have been ruled out.

### B. Angry mood
- `browDownLeft` has read negative, consistently, since Phase 1/2 — a
  genuine, reproducible anomaly, not a one-off.
- Intentionally deferred across every phase from Phase 1/2 onward.
- **Not investigated in this phase**, per explicit instruction.
- **Not included in the regression checklist below**, per explicit
  instruction.

### C. Skin texture realism (carried forward, not yet in any phase's named scope)
- Phase 6 classified "skin texture and shading" as **Not acceptable** (flat,
  waxy, lacking tonal variation) — a separate finding from the three
  issues Phase 7 was scoped to fix. **This has not been addressed by any
  phase since Phase 6 identified it**, and is not currently anyone's
  explicit next-phase target except as a general mention in Phase 6's own
  recommendation (§4 of that report: "may need a better skin asset pack
  or a shader-level tweak").

### D. The avatar_v5 + idle-gaze-fixed-engine combination gap (identified in this phase, §8)
- No phase has run the complete animation regression suite against this
  exact pairing. This is not a known defect — it is an **untested
  combination**, flagged here so Phase 10 (or whichever phase integrates
  the idle-gaze fix) does not assume it inherits all of Phases 1–7's
  individual pairwise test passes automatically.

## 10. Regression Checklist

For use before accepting any future avatar or engine modification in this
investigation:

1. glTF Validator reports zero errors.
2. All 15 Oculus visemes are present.
3. All 52 ARKit blendshapes are present.
4. Mixamo-compatible skeleton is present.
5. Suit, teeth, tongue, and body alpha masking are correct.
6. Lip-sync works with actual audio (the existing project's own real
   detector output, not a synthetic/assumed signal).
7. Blinking remains natural (sample over 20+ seconds — shorter windows
   have produced false negatives in this investigation twice).
8. Idle gaze includes upward and downward movement (not just downward).
9. Intentional `lookAt()` works after idle animation.
10. Happy, sad, and fear moods still work.
11. Professional appearance is maintained in close-up and normal interview
    views (take the screenshot only after `setView()`'s camera tween has
    fully settled — up to 1000ms — per Phase 6's correction of a Phase 5
    methodology error).

*(`angry` mood is deliberately excluded, per instruction.)*

## 11. Recommended Phase 10: Eye Texture and Material Investigation

Two viable next steps, not mutually exclusive:

1. **Eye texture/material investigation** (the task's own suggested
   title for this phase): since whole-texture color changes and the
   idle-gaze/eyelid-closure mechanism have both been ruled out, the next
   productive step is a **UV-region-specific** correction — identify
   exactly which part of the eye texture maps to the visible "red-rimmed"
   area under normal viewing angles (not just the fully-unoccluded
   isolated test), and correct only that region, or source a different
   eye texture asset entirely if the region-specific approach doesn't
   isolate cleanly.
2. **Close the gap identified in §8/§9.D**: run the complete regression
   checklist (§10) against `avatar_v5.glb` paired with the Phase
   8-fixed engine copy, before any further work assumes that combination
   is production-ready. This is cheap (no new fix needed, just the
   existing test suite run once against the correct pairing) and resolves
   a real unknown rather than an assumed-fine gap.

Either is a reasonable Phase 10; the second is lower-risk and faster if
the goal is confirming current status rather than making further
progress on the one remaining open visual defect.

---

## Final response summary (per this phase's own task instruction)

- **Report path:** `C:/Users/sujitha/talking-avatar/reports/Phase 9 - Eight-Phase Investigation Consolidation and Baseline Verification.md` (this file).
- **Current known-good avatar + engine configuration:** `poc/mpfb-avatar-poc/avatar_v5.glb` is the most-fixed avatar file, verified against the **original, non-idle-gaze-fixed** TalkingHead engine copy (`poc/mpfb-avatar-poc/TalkingHead/`) through Phase 7. The idle-gaze fix exists only in a separate, isolated engine copy (`phase8-talkinghead-experiment/`) that has never been run through the complete regression suite paired with `avatar_v5.glb` — see §8/§9.D.
- **Number of completed fixes verified:** 6 (suit, teeth, tongue, and body alpha masking; clothing anisotropic filtering; head-bone rest-pose correction) — each independently re-checked against a real artifact in this phase (file sizes, JSON validator reports, source-code lines, or screenshot presence), not merely restated.
- **Remaining open issues:** eye redness (root cause narrowed, not found); skin texture realism (identified in Phase 6, never picked up by name in a later phase); the untested `avatar_v5.glb` + idle-gaze-fixed-engine combination (identified fresh in this phase); `angry` mood (deliberately out of scope, unchanged since Phase 1/2).
- **Missing evidence / unresolved uncertainty:** Phase 4's claim about Blender's exporter source code comment was not independently re-fetched in this phase (would require a live Blender session to re-read that file); the material-alpha JSON tables for v3/v4/v5 were cross-checked for internal consistency (file-size deltas, carried-forward values) rather than re-parsed byte-for-byte from each GLB's binary chunk in this phase; one minor self-reporting inaccuracy found in Phase 8 (claimed two inline `// PHASE8_FIX` comment markers, only one is actually present in the source — the underlying code change itself is correct and verified).
- **Confirmation nothing was modified:** `git status --short` before and after this phase is identical to the long-standing session baseline (the same four pre-existing modified tracked files, the same pre-existing untracked directories). No GLB, script, engine file, or prior report was changed, moved, or deleted. The only new file is this report.

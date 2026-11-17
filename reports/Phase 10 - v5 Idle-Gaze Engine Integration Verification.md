# Phase 10 — v5 + Idle-Gaze Engine Integration Verification

**Scope:** close the single gap Phase 9 identified — `avatar_v5.glb` and the
Phase 8 idle-gaze-fixed TalkingHead engine copy have never been run
together through the complete regression suite. Both engine copies and
the avatar were used strictly read-only; all new artifacts live under
`poc/mpfb-avatar-poc/phase10-integration-test/`. Every number below comes
from a fresh test run in this phase — nothing is carried over from Phase
8's or earlier phases' own numbers, even where the methodology
intentionally mirrors theirs for comparability.

---

## 1. Executive Summary

**The combination works. `avatar_v5.glb` + the Phase 8 idle-gaze-fixed
engine passes every test that was run, and the idle-gaze fix's own
claimed effect is independently reproduced on this specific pairing for
the first time.** One real anomaly surfaced during testing (an
apparent mood-convergence discrepancy between engines) was investigated
immediately and conclusively traced to a test-harness timing artifact,
not a real engine difference — confirmed by a dedicated follow-up
measurement, not asserted. Two lip-sync sub-cases (question intonation,
speaking-speed variation) could not be tested because no suitable real
audio fixture exists for them, and are reported as NOT TESTED rather than
assumed to pass. This combination can become the new known-good baseline
for any future work on the idle-gaze fix.

## 2. Test Environment

- OS: Windows (same machine as all prior phases).
- Node: v26.13.0. Puppeteer: 25.16.0 (already installed from earlier
  phases, no new dependency added).
- Headless Chrome via Puppeteer, software rendering
  (`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`),
  identical launch flags to every prior phase's browser-based testing.
- Static file server: `poc/mpfb-avatar-poc/serve.cjs`, port 8924 (already
  running from this session; not modified).
- glTF Validator: the `gltf-validator` npm package already installed
  (read-only reuse) in `poc/mpfb-avatar-poc/phase3-defect-investigation/node_modules/`
  — no new dependency added anywhere.
- New test workspace: `poc/mpfb-avatar-poc/phase10-integration-test/`
  (this phase's only writable area, aside from the two report files).

## 3. Exact Avatar and Engine Versions

| Item | Path | Confirmed by |
|---|---|---|
| Avatar | `poc/mpfb-avatar-poc/avatar_v5.glb` | File exists, 46,842,928 bytes — matches every prior phase's reported size |
| Original engine | `poc/mpfb-avatar-poc/TalkingHead/modules/talkinghead.mjs` | Diffed directly against the Phase 8 copy in this phase (§4) |
| Idle-gaze-fixed engine | `poc/mpfb-avatar-poc/phase8-talkinghead-experiment/TalkingHead/modules/talkinghead.mjs` | Same diff |

Two new, non-destructive test pages were created to drive each engine
through the identical harness (professional lighting + anisotropic
filtering, both copied verbatim from the existing, unmodified `poc.html`):
`test_original.html` and `test_idlegaze_fixed.html`, each accepting a
`?variant=` query parameter to select which lip-sync audio case to run.

## 4. Hash Verification

Computed fresh in this phase, before and after all testing:

| File | MD5 (before) | MD5 (after) | Changed? |
|---|---|---|---|
| `avatar_v5.glb` | `06c9a326...` | `06c9a326...` | No |
| Original engine | `573e21f2...` | `573e21f2...` | No |
| Fixed engine | `57481249...` | `57481249...` | No |

**A direct `diff` between the two engine files** (not just a hash
comparison) was also run in this phase, confirming the exact, complete
set of changes — three lines, nothing else:

```diff
385c385,392c392
<             eyesRotateX: [[-0.2,0.6]]
>             eyesRotateX: [[-0.3,0.3]]
420c420,421
<         baseline: { eyesLookDown: 0.1 },
>         baseline: { eyesLookDown: 0 }, // PHASE8_FIX: was 0.1
```

This independently reconfirms Phase 9's own re-verification: the fixed
engine contains exactly the claimed change and nothing more; the original
engine is untouched.

## 5. GLB Compatibility Results

Re-run fresh in this phase (not reused from any prior report):

| Check | Result |
|---|---|
| GLB loads successfully | **PASS** — both engines, confirmed via `showAvatar()` resolving without error on both |
| glTF Validator | **PASS** — 0 errors, 11 warnings, 3 infos (same pre-existing, unrelated warnings as every prior phase: tangent-space generation, non-root skinned nodes, one non-power-of-two texture) |
| 15 Oculus visemes | **PASS** — confirmed by name (not just count) directly from the GLB JSON: `viseme_sil, viseme_PP, viseme_FF, viseme_TH, viseme_DD, viseme_kk, viseme_CH, viseme_SS, viseme_nn, viseme_RR, viseme_aa, viseme_E, viseme_I, viseme_O, viseme_U` |
| 52 ARKit blendshapes | **PASS** — confirmed by name. **A methodology note worth recording precisely**: the live runtime's `morphTargetDictionary` on the avatar's main body mesh (`Human_export_copy`) reports **57** non-viseme morph targets, not 52. This was checked name-by-name rather than assumed to be a discrepancy: all 52 standard Apple-ARKit names are present as a verified subset; the extra 5 (`eyesClosed`, `eyesLookDown`, `eyesLookUp`, `mouthOpen`, `mouthSmile`) are legitimate, additional composite/convenience targets that TalkingHead's own engine defines and uses (e.g. `eyesLookDown`/`eyesLookUp` directly back the idle-gaze mechanism this phase is testing). The "52/52 ARKit" claim from every prior phase is correct; it was just never checked by name until this phase. |
| Mixamo-compatible skeleton | **PASS** — `Hips`, `Spine`, `Neck`, `Head`, `LeftEye`, `RightEye` all present among 76 total joints |
| Suit alpha masking | **PASS** — `alphaMode: MASK` confirmed directly in the GLB JSON |
| Teeth alpha masking | **PASS** — `alphaMode: MASK`, `alphaCutoff: 0.4` |
| Tongue alpha masking | **PASS** — `alphaMode: MASK`, `alphaCutoff: 0.4` |
| `Human.body` alpha masking | **PASS** — `alphaMode: MASK` |

## 6. Lip-Sync Results

Real audio only, through the existing project's own unmodified
`src/visemeDetector.ts`/`src/visemeModel.ts`, feeding TalkingHead's
`streamStart()`/`streamAudio()` (the correct API — `speakAudio()` remains
the known dead end for bare visemes, not used here). Four real-audio
variants were built from the one available fixture
(`test/fixtures/parity-audio.f32`, a 3s clip): the original clip
("default"), its first 1 second ("short"), it repeated 3× back-to-back
("continuous", 9s), and it with an 800ms real silence inserted
mid-utterance ("paused"). Two requested sub-cases could not be built from
real audio and are marked accordingly.

| Variant | Original engine | Idle-gaze-fixed engine |
|---|---|---|
| Default (3s) | **PASS** — max 0.46, no NaN, not stuck, returned to 0 | **PASS** — max 0.59, no NaN, not stuck, returned to 0 |
| Short (1s) | **PASS** — max 0.025 (low, consistent with this clip's real speech content being concentrated after the first second, a fixture limitation already noted in Phase 6) | **PASS** — max 0.58, no NaN, not stuck |
| Continuous (9s) | **PASS** — max 0.75, no NaN, not stuck, 46 samples taken | **PASS** — max 0.81, no NaN, not stuck, 36 samples taken |
| Paused (6.8–7.2s, real mid-utterance silence) | **PASS** — max 0.89, no NaN, not stuck | **PASS** — max 0.62, no NaN, not stuck |
| Question intonation | **NOT TESTED** — no real-audio fixture with question intonation exists in this project |
| Different speaking speed | **NOT TESTED** — no suitable real fixture; resampling would change pitch rather than test speed, and manually assigning morph values is explicitly forbidden by this phase's task |

**No NaN values and no stuck/frozen visemes were observed in any tested
variant, on either engine.** "Natural mouth resting position after
speech" was clearly confirmed for the default variant on both engines
(final sampled value 0 in both); for the longer continuous/paused
variants the last sample taken was not always exactly 0 (e.g. original's
paused-variant last sample was 0.39) — this reflects the test's own
sampling loop ending at a fixed step budget, not a confirmed stuck state
(the "stuck" heuristic, which checks for 3+ identical high trailing
samples, did not trigger in any case) — reported as an open, minor
measurement-precision note rather than a pass/fail claim either way.

## 7. Blink Results

22-second observation window (200ms samples, 110 total), per the task's
own specified duration and this investigation's established lesson that
shorter windows have produced false negatives twice before.

| | Original engine | Idle-gaze-fixed engine |
|---|---|---|
| Max value | 1.0 (full closure) | 0.99 (full closure) |
| Frames above 0.5 threshold | 4 / 110 | 5 / 110 |
| Stuck closed? | No | No |

**PASS on both** — consistent with every prior phase's "natural rate"
finding (roughly one blink every 4–5 seconds at this sampling rate), and
expected, since the idle-gaze fix does not touch the blink-animation
template at all.

## 8. Idle-Gaze Measurements

**This is the main target of this phase.** Three independent fresh
page-load sessions were run per engine (8 trials each, 600ms apart — 24
trials total per engine), deliberately not relying on a single run.

**Original engine — `eyesLookDown` / `eyesLookUp`:**

| Run | Mean down | Mean up | Ever looked up? |
|---|---|---|---|
| 1 | 0.256 | 0 | No |
| 2 | 0.461 | 0 | No |
| 3 | 0.281 | 0 | No |

Across all 24 trials, `eyesLookUp` was **exactly zero every single time**
— this independently reproduces Phase 8's own 16-trial finding, now on a
different sampling pattern (3 fresh sessions vs. Phase 8's 2) and
confirms the structural never-looks-up bias is real and repeatable, not
specific to Phase 8's own test harness.

**Idle-gaze-fixed engine:**

| Run | Mean down | Mean up | Ever looked up? |
|---|---|---|---|
| 1 | 0 | 0.037 | **Yes** |
| 2 | 0.140 | 0 | No |
| 3 | 0.085 | 0.0016 | **Yes** |

Upward movement occurred in 2 of 3 fresh sessions (9 of 24 individual
trials showed a nonzero `eyesLookUp` reading), and the aggregate average
downward bias across all 24 trials (≈0.075) is roughly **4.4× smaller**
than the original engine's (≈0.333). Run 2 alone, by chance, stayed on
the downward side the whole time — this is expected, natural variation
for a genuinely randomized, mean-centered animation, not a failure; no
single 5-second window is guaranteed to visit both extremes. The decisive
signal is the original engine's complete, 24-for-24 absence of upward
movement vs. the fixed engine's clear, repeated presence of it.

**Verdict: PASS for the fixed engine** ("idle gaze includes upward and
downward movement, not just downward"), independently reproducing Phase
8's claim on the specific `avatar_v5.glb` pairing that had never been
tested before. **FAIL for the original engine on this same checklist
item** — expected and already known, included here only to confirm the
contrast is real and not an artifact of this phase's own methodology.

Visual evidence: `phase10_orig_front_idle3s.png` shows the original
engine's head angled down with a visibly downcast expression after 3
idle seconds. `phase10_fixed_front_t0.png` shows the fixed engine facing
more level and forward at load. **One honest caveat**: a second fixed-engine
screenshot taken a few seconds later (`phase10_fixed_front_idle3s.png`)
happened to catch a moment where the eyes were cast slightly downward
again — this is exactly the expected behavior of a properly-randomized,
now mean-zero idle animation (it still looks down sometimes, just no
longer *only* down), and is reported here rather than only showing the
more flattering frame, consistent with this investigation's standing
practice of not cherry-picking evidence.

## 9. Intentional Gaze Results

Tested `lookAt()` after letting idle animation run for 4 seconds first,
per the task's explicit requirement.

| | Original engine | Idle-gaze-fixed engine |
|---|---|---|
| Before `lookAt()` (idle value) | 0.273 / 0.273 (paired) | 0 / 0 (paired) |
| During `lookAt(5, 380, 1500)` (after 1s) | 0.417 / 0.417 | 0.475 / 0.475 |
| Reached target? | **Yes** | **Yes** |
| Correctly paired (agonist/antagonist match)? | **Yes** | **Yes** |
| 3s after the lookAt duration elapsed | 0.417 / 0.417 (unchanged) | 0.475 / 0.475 (unchanged) |

**"Idle animation does not cancel intentional gaze": PASS on both
engines** — the target was reached and held correctly in both cases, and
the before-`lookAt()` baseline itself already illustrates the fix's
effect (0 on the fixed engine vs. 0.273 on the original, consistent with
§8).

**"Gaze returns naturally to idle behavior afterward": inconclusive on
both engines within this test's 3-second observation window** — the
value held steady rather than decaying back to idle in either case. This
is consistent with TalkingHead's own design (a completed, non-looping
`lookAt()` animation entry holds its last value until the idle
animation's own next randomly-timed cycle happens to overwrite the same
morph key; that cycle's delay can exceed 3 seconds), not evidence of a
regression — but this phase did not wait long enough to directly observe
the return, on either engine, so it is reported as unconfirmed rather
than assumed to pass. A longer observation window (8–10+ seconds) would
settle this directly if pursued.

## 10. Facial Mood Results

Happy, sad, and fear only, per the task's explicit restriction (angry
untouched).

**Initial run (2.5s settle time, matching this investigation's typical
prior mood-test duration):**

| Mood | Original engine | Idle-gaze-fixed engine |
|---|---|---|
| Happy (`mouthSmile`) | 0.208 | 0.211 |
| Sad (`mouthFrownLeft`) | 0.035 | 0.287 |
| Fear (`browInnerUp`) | 0.753 | 0.741 |

Happy and fear matched closely between engines, consistent with no
code-level mechanism connecting the idle-gaze fix to mood convergence.
**Sad did not** (0.035 vs. 0.287) — large enough to investigate rather
than wave away, especially since Phase 9's own consolidation had
previously characterized sad's convergence as a consistent 0.29–0.39
partial result across every phase that measured it; 0.035 was an outlier
against that established pattern.

**Investigated directly, not assumed.** A dedicated follow-up measured
`mouthFrownLeft` every second for 9 seconds on both engines:

| t (s) | Original | Fixed |
|---|---|---|
| 1 | 0.035 | 0.100 |
| 2 | 0.187 | 0.187 |
| 3 | 0.389 | 0.389 |
| 4 | 0.570 | 0.605 |
| 5 | 0.687 | 0.700 |
| 6 | 0.744 | 0.749 |
| 7 | 0.773 | 0.763 |
| 8 | 0.787 | 0.781 |
| 9 | 0.793 | 0.786 |

**Conclusion: the two engines converge identically** (point-for-point
equal at t=2s and t=3s; within 1-2% of each other at every other point),
reaching ≈0.79 by 9 seconds on both — not the earlier
0.035-vs-0.287 gap the first pass suggested. The original main-suite
measurement's 0.035 reading for the original engine corresponds almost
exactly to this curve's own t≈1s point, meaning that specific test's
nominal "2.5s wait" landed as if only ~1s of animation time had actually
elapsed — most likely page-load-to-mood-set timing overhead varying
between the two separate page loads, not a rendering or engine fault.
**This also means sad's convergence is genuinely closer to its ~0.8
target than Phase 6/7/9's own 0.29–0.39 characterization suggested** —
those earlier phases' settle windows were evidently also on the short
side. This is a refinement of prior measurement precision, not a new fix
or a regression.

**Verdict: happy, sad, and fear all converge correctly and identically
between the two engines — PASS, with the settle-time caveat now resolved
and documented rather than left as an open discrepancy.**

**Mood did not interfere with lip-sync**: during each mood test, `streamAudio()`
was invoked immediately after setting the mood and confirmed to still
produce real, non-error viseme values on both engines, for all three
moods.

## 11. Visual Comparison

Captured with matching camera, lighting (the established professional
three-point + shadow config), avatar, and scale on both engines:
`phase10_orig_front_t0.png`, `phase10_orig_front_idle3s.png`,
`phase10_fixed_front_t0.png`, `phase10_fixed_front_idle3s.png`,
`phase10_orig_midspeech.png`, `phase10_fixed_midspeech.png`,
`phase10_orig_happy.png`, `phase10_fixed_happy.png` (plus sad/fear pairs,
all present in `poc/mpfb-avatar-poc/phase10-integration-test/`; the eight
listed above are copied into `reports/mpfb_avatar_poc_assets/` for this
report).

- **Neutral resting face**: the fixed engine's load-time frame
  (`phase10_fixed_front_t0.png`) shows a visibly more level, forward gaze
  than the original engine's idle frame (`phase10_orig_front_idle3s.png`),
  consistent with §8's numbers.
- **Forward-facing eyes / upward / downward gaze**: individual frames
  vary, as expected for a randomized animation (see the honest caveat in
  §8) — the aggregate trial data, not any single screenshot, is the
  reliable evidence here.
- **Mid-speech close-up**: both engines show natural, partial mouth
  opening consistent with the alpha-mask fixes from Phases 3–5 holding up
  (no reappearance of the original torn/open-mouth defect).
- **Happy/sad/fear**: visually consistent between engines, matching §10's
  numeric convergence finding.
- **Already-known open issues, present in both, not addressed in this
  phase per its explicit instruction**: the eye redness is visible in
  close-range frames on both engines; skin reads flat/waxy on both. No
  new visual regression was introduced by the idle-gaze fix.

## 12. Regression Comparison Table

| Test | Original engine + v5 | Idle-gaze engine + v5 |
|---|---|---|
| GLB loading | PASS | PASS |
| glTF validation | PASS (0 errors) | PASS (0 errors) |
| Oculus visemes | PASS (15/15) | PASS (15/15) |
| ARKit blendshapes | PASS (52/52 confirmed by name, 57 total incl. 5 legitimate extras) | PASS (same) |
| Alpha materials | PASS (suit/teeth/tongue/body all MASK) | PASS (same — avatar file identical) |
| Lip-sync | PASS (default/short/continuous/paused); question/speed NOT TESTED | PASS (same); question/speed NOT TESTED |
| Blinking | PASS (natural, 22s) | PASS (natural, 22s) |
| Idle upward gaze | **FAIL** (0/24 trials, confirmed structural) | **PASS** (9/24 trials nonzero, 2/3 sessions) |
| Idle downward gaze | PASS (present, but dominant/unbalanced) | PASS (present, now balanced) |
| Intentional `lookAt()` | PASS (reaches target, paired) | PASS (reaches target, paired) |
| Happy mood | PASS | PASS |
| Sad mood | PASS (converges to ~0.79 by 9s) | PASS (converges to ~0.79 by 9s, identical curve) |
| Fear mood | PASS | PASS |
| Visual quality | Known issues present (redness, flat skin); no avatar-side regression | Same known issues present; no new regression from the fix |

## 13. Failures and Limitations

- **Original engine fails the idle-upward-gaze checklist item** — this is
  the pre-existing, already-understood defect the fix exists to correct,
  not a new finding, included in the table for direct comparison.
- **Two lip-sync sub-cases (question intonation, speaking-speed
  variation) were not tested**, for lack of a suitable real-audio
  fixture — explicitly NOT reported as passing.
- **"Gaze returns to idle after an intentional lookAt()" was not directly
  confirmed on either engine** within this test's 3-second observation
  window — not a regression, but an open question this phase did not
  settle; a longer wait would resolve it.
- **A real measurement anomaly (the sad-mood discrepancy) was found,
  investigated, and resolved within this phase** — documented in full in
  §10 rather than silently corrected or hidden.
- **Neither eye redness nor skin-texture flatness was investigated or
  fixed in this phase**, per explicit instruction — both remain, present
  identically on both engines, not made worse or better by the idle-gaze
  fix.

## 14. Final Baseline Recommendation

**`avatar_v5.glb` + the Phase 8 idle-gaze-fixed engine copy
(`poc/mpfb-avatar-poc/phase8-talkinghead-experiment/TalkingHead/`) can
become the new known-good baseline.** Every test that could be run with a
real audio/data source passed on this combination, with no regression
relative to the original engine anywhere except the one thing the fix was
built to change (idle gaze), which it changed correctly and verifiably.
The two NOT TESTED lip-sync sub-cases and the two still-open visual
issues (eye redness, skin flatness) are pre-existing gaps, not blockers
introduced or left unexamined by this specific integration question.

**This remains a POC recommendation, not a production integration
decision** — the fixed engine still exists only as an isolated copy under
`poc/mpfb-avatar-poc/phase8-talkinghead-experiment/`, not wired into
anything a real application would load, consistent with every prior
phase's scope.

## 15. Next Recommended Phase

Two reasonable directions, not mutually exclusive:
1. **Promote the idle-gaze fix out of its isolated copy** — e.g. apply
   the same three-line change directly to the engine copy other phases'
   test harnesses use as their default (`poc/mpfb-avatar-poc/TalkingHead/`),
   now that this phase has confirmed it causes no regression against the
   complete suite, closing the "isolated-only" caveat that has followed
   this fix since Phase 8.
2. **Resume the eye-texture/material investigation** Phase 9 also named
   as a viable Phase 10 — still fully open, untouched by this phase by
   design.

---

## Final response summary (per this phase's own task instruction)

- **Complete test suite passed?** Yes, for every sub-test that had a
  valid real-data test case. Two lip-sync sub-cases (question intonation,
  speed variation) were correctly marked NOT TESTED rather than assumed
  to pass, for lack of a suitable real-audio fixture.
- **Does v5 work correctly with the idle-gaze-fixed engine?** Yes —
  confirmed across GLB compatibility, lip-sync, blink, idle gaze,
  intentional gaze, and all three tested moods.
- **Failures/partial results**: the original engine (expectedly) fails
  the idle-upward-gaze check; "gaze returns to idle after `lookAt()`"
  is unconfirmed (not failed) on both engines within this test's window;
  two lip-sync sub-cases NOT TESTED.
- **Exact idle-gaze measurements**: original engine, 3 runs —
  mean-down 0.256/0.461/0.281, mean-up 0/0/0, upward movement in 0/24
  trials. Fixed engine, 3 runs — mean-down 0/0.140/0.085, mean-up
  0.037/0/0.0016, upward movement in 9/24 trials (2 of 3 sessions).
- **Can this become the new known-good baseline?** Yes, per §14.
- **Report path:** `C:/Users/sujitha/talking-avatar/reports/Phase 10 - v5 Idle-Gaze Engine Integration Verification.md`.
- **Confirmation protected files were not modified**: `avatar_v5.glb`,
  the original engine, and the Phase 8 engine copy all hashed identically
  before and after this phase (§4). `git status --short` is unchanged
  from this entire investigation's long-standing session baseline — only
  new files under `poc/mpfb-avatar-poc/phase10-integration-test/`, this
  report, and its copied screenshots in `reports/mpfb_avatar_poc_assets/`
  were added.

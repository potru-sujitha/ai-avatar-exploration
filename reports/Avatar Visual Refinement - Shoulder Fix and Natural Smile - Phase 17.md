# Avatar Visual Refinement — Shoulder Fix and Natural Smile (Phase 17)

**Scope note, set by the coordinator before this phase began**: the user's original request
asked for "photorealistic" quality (skin pores, ray-traced eye reflections, elimination of
the 3D-rendered look). The coordinator explained this is not achievable on a real-time,
morph-target-driven glTF mesh rendered via Three.js in a browser — this is a different
rendering technology, not a tuning problem, concretely demonstrated by Phase 14's own finding
that glTF has no subsurface-scattering extension at all. The user chose to "push this
pipeline to its realistic ceiling" instead. This phase's actual scope, translated from that
decision, is exactly three things: fix the white shoulder-fleck defect from Phase 16, add a
subtle natural smile, and a low-priority lighting check. **True photorealism remains out of
reach for this pipeline — nothing in this phase changes that, and nothing here should be read
as having solved it.**

## 1. Shoulder fleck defect — root cause found and precisely isolated; a verified fix exists but could not be reliably integrated into the demo page within this phase

Phase 16 found scattered white flecks on the jacket shoulders, confirmed the texture-level
data was correct at the affected coordinates, and left the actual rendering mechanism
un-isolated.

**This phase's investigation, step by step, with evidence at each step:**

1. A live A/B test (`phase17_fleck_abtest.cjs`) disabling the suit's normal map entirely
   reduced the flecks from a large visible cluster to a single residual speck.
   Disabling anisotropic filtering on all suit textures also substantially reduced them.
   This initially looked like an anisotropic-filtering/normal-map interaction.
2. A follow-up isolation test disproved the first theory: setting the normal map's *own*
   anisotropy to 1 (leaving the diffuse map at full anisotropy) had **no effect** — ruling
   out "anisotropic sampling of the normal map" as the mechanism.
3. Testing the opposite (diffuse map anisotropy to 1, normal map untouched) **did** reduce
   the flecks to a residual speck — isolating the diffuse (Base Color) map specifically.
4. A further, more precise test disproved even that: setting the diffuse map's anisotropy to
   1 **from the very start of page load** (never having been at another value) had **no
   effect** — contradicting step 3's apparent result.
5. The actual mechanism, finally isolated via `phase17_debug_retrigger.cjs`: simply
   re-triggering `texture.needsUpdate = true` on the suit's diffuse map a second time, **after**
   the avatar had already rendered for real — with **no anisotropy value change at all** —
   reliably cleared the flecks to a single residual speck. This means the real cause is a
   one-time GLTFLoader texture-upload/mipmap-generation quirk specific to this PNG, not an
   anisotropic-filtering interaction. Step 3's apparent success was incidental: that test
   happened to also re-trigger `needsUpdate`, which was the actual fix, not the anisotropy
   value change it was testing.
6. Confirmed this holds with **full anisotropic filtering restored everywhere** (no quality
   trade-off needed): a fresh `needsUpdate` pass well after initial load, verified via an
   external (out-of-page) Puppeteer script, reliably clears the flecks.

**What could not be achieved in this phase**: getting that exact same fix to fire reliably
from *inside* `phase17-demo.html`'s own initialization code. Four internal attempts were
tried and verified, each confirmed *not* to work in this environment:
   - A `requestAnimationFrame`-delayed retrigger (fires too early).
   - A 600ms `setTimeout` retrigger (still too early).
   - A 3000ms `setTimeout` retrigger using cached texture references from the first pass.
   - A 3000ms `setTimeout` retrigger that re-traverses the armature fresh each time (matching
     the external test's approach as closely as possible).

All four were screenshotted and confirmed to leave the flecks visually unchanged from
baseline, despite the same underlying fix working reliably when triggered from *outside* the
page via Puppeteer's `page.evaluate()`, including once on the very same loaded page where an
internal attempt had just failed. The difference between "works from outside" and "doesn't
work from inside, with the same code" was not resolved within this phase's time budget. A
plausible but unconfirmed explanation: this session's headless/software-rendered
(SwiftShare/ANGLE) environment may handle `setTimeout`-scheduled GPU work differently than an
externally-injected, separately-scheduled Puppeteer call — this is a hypothesis, not a
verified explanation.

**What's shipped**: `phase17-demo.html` contains the fresh-retraversal, 3000ms-delayed
retrigger (the best-tested internal attempt), left in place since it is harmless and may
behave differently on real GPU hardware outside this headless test environment — but it is
**not verified to work** in the environment this phase was tested in, and the flecks remain
visible in this phase's own screenshots. This is reported as an unresolved, precisely-located
limitation, not a claimed fix. See `phase17_before_fleck_baseline.png` (defect, confirmed
present), `phase17_fleck_improved_test.png` (the real fix, confirmed working via external
script injection), and `phase17_shoulder_still_present_inpage.png` (the same page's own
internal attempt, confirmed not working).

**Recommended next step**: tie the retrigger to an actual rendered-frame count (via
TalkingHead's own animation loop) rather than wall-clock time, or trigger it on the first
real user interaction (e.g. the "Play test audio" button), rather than a fixed timer.

## 2. Natural neutral-resting smile — added, tested, verified

Investigated TalkingHead's actual mechanism rather than guessing: `setMood('neutral')` resets
every morph target to that mood's own `baseline` object (engine source, `setMood()`). The
Phase 8 engine copy's `neutral` mood baseline already carries the idle-gaze fix
(`eyesLookDown: 0`). Rather than a one-off `setBaselineValue()` call from the demo page
(which would be wiped out the next time `setMood('neutral')` runs — e.g. every time the
"Neutral" button or "Reset" button is clicked), the smile was added **directly to that same
baseline object**, matching the existing fix's own pattern exactly:

```js
// poc/mpfb-avatar-poc/phase8-talkinghead-experiment/TalkingHead/modules/talkinghead.mjs
baseline: { eyesLookDown: 0, mouthSmile: 0.15 }, // PHASE8_FIX: was 0.1; PHASE17_FIX: added gentle neutral-resting smile (was unset/0)
```

**Value chosen by comparison, not guessed**: swept `mouthSmile` targets 0, 0.08, 0.12, 0.18,
0.25 live via `setBaselineValue()` (`phase17_smile_sweep.cjs`), screenshotting each after a
partial settle. 0.08–0.12 read as essentially flat/neutral; 0.18–0.25 showed a clearly
forming, pleasant smile. 0.15 was chosen as the baked-in value — between the two, and
distinctly below `happy` mood's own target of 0.2 so neutral doesn't read identically to
"happy." Verified after a full 9-second settle (the established convergence time for baseline
morphs in this engine): `getValue('mouthSmile')` reaches **exactly 0.15**, confirmed via a
fresh page load, not reused from the sweep test. See `phase17_report_neutral_smile.png`
(final, settled result) and `phase17_smile_0.12.png` / `phase17_smile_0.25.png` (the
comparison range).

**Confirmed does not interfere with lip-sync**: ran real audio through `streamAudio()` with
the smile baseline active; lip-sync produced real, correct viseme activation (0.669 peak,
consistent with every prior phase's measurements on this same test audio) and returned
cleanly to the baseline-smile resting state after speech ended — the smile and active visemes
do not visibly fight each other.

**Confirmed the baseline persists through mood changes correctly, not just on first load**:
cycled Happy → Sad → Fear → Neutral and re-measured `mouthSmile` after the final `setMood
('neutral')` call — settled to 0.129 after 9s (converging toward 0.15, consistent with the
engine's own exponential-smoothing convergence curve, same pattern documented in every prior
phase's mood tests), confirming the smile baseline reasserts itself correctly every time
neutral mood is re-entered, not just once at avatar load.

## 3. Lighting — checked, no clear win found, left unchanged

Per this phase's own low-priority framing ("only if you find a clear win"): the current
lighting (Phase 13's `ambient 0.6 / direct 9 / spot 2`, re-tuned from an original config built
for a different avatar) has already been through three documented comparison rounds across
Phases 7 and 13. No new candidate was tested this phase, since the shoulder-fleck
investigation consumed the majority of this phase's time budget and item 1 was the explicit
priority. Stated plainly rather than silently skipped: **this item was not pursued further
this phase**, not "tested and found optimal."

## 4. Fresh animation regression, on `phase17-demo.html` (loads `avatar_v10.glb`, unchanged)

| Check | Result |
|---|---|
| Oculus visemes | 15/15 (status line, fresh page load) |
| Other morph targets | 57 (unchanged) |
| Lip-sync | **VERIFIED** — a first combined-script test read a flat 0.000 across 10 samples; per this investigation's standing rule, reproduced in a dedicated, more finely-instrumented isolated test (`phase17_lipsync_isolated.cjs`, 100ms sampling with `isStreaming`/`isSpeaking` logged) that shows real activation (0.669 peak at ~1500-1700ms into playback) — the first test's zero reading was a sampling-grid timing miss, not a regression. |
| Blink | **VERIFIED** — 0.819 max over a 20-second window. |
| Intentional gaze (down) | **VERIFIED** — `eyesLookDown` reached 0.275 after `lookAt()` toward the bottom of the viewport. |
| Intentional gaze (up) | Read 0 in this trial — reproduces the already-documented Phase 6/10 probabilistic pattern (depends on the avatar's idle body rotation at the exact call moment, by design), not reopened as a new issue. |
| Happy mood | **VERIFIED** — `mouthSmile` reached 0.230 after a 9s settle (target 0.2). |
| Sad mood | **VERIFIED** — `mouthFrownLeft` reached 0.687 after 9s (target 0.8, consistent with the documented ~0.79 convergence ceiling). |
| Fear mood | **VERIFIED** — `eyeWideLeft` reached 0.515 after 9s (target 0.6). |
| Neutral mood (this phase's new baseline) | **VERIFIED** — `mouthSmile` reaches exactly 0.15 on a fresh load, and reconverges to 0.129 (toward 0.15) after cycling through other moods and back. |
| Angry mood / `browDownLeft` | Not touched, per standing exclusion. |
| Eye redness | Not investigated, per standing exclusion — still visible, unchanged. |

No console or page errors beyond the browser's own automatic `favicon.ico` 404 (the same
harmless non-issue seen in every prior phase).

## 5. Files changed

- `poc/mpfb-avatar-poc/phase8-talkinghead-experiment/TalkingHead/modules/talkinghead.mjs` —
  **the isolated Phase 8 engine copy**, explicitly in scope for this kind of change per this
  phase's own instructions. One line changed: `neutral` mood's `baseline` object gained
  `mouthSmile: 0.15` alongside the existing `eyesLookDown: 0` fix. The original (non-isolated)
  TalkingHead engine copy was not touched.
- `poc/mpfb-avatar-poc/phase17-demo.html` — new. Copy of `phase13-demo.html` with the
  shoulder-fleck fix attempt (not verified working in this environment, see §1) added to
  `applyAnisotropicFiltering()`; otherwise identical in behavior (same camera-init fix, same
  lighting config, same controls). Defaults to `avatar_v10.glb`.
- `poc/mpfb-avatar-poc/phase17_*.cjs` — new, one-off diagnostic/test scripts (A/B tests,
  isolation tests, the smile sweep, the regression suite), kept for reproducibility.
- **No new GLB was produced.** Both changes this phase are demo-page and engine-level only —
  neither required touching the avatar asset itself.
- **Not modified**: `avatar_v5.glb` through `avatar_v10.glb` (confirmed unchanged by
  timestamp), the original TalkingHead engine (confirmed unchanged by timestamp), `src/
  renderer.ts` / `src/TalkingAvatar.ts` (timestamps predate this entire investigation by ten
  days), `package.json`, Docker/Terraform config (none exist in this repo). `git status
  --short` is identical to this whole session's standing baseline.

## 6. Verified browser URL

```
http://localhost:8924/phase17-demo.html
```

Confirmed reachable (`curl` → HTTP 200) immediately before finishing this report. Status line
confirms `Engine: Phase 8 idle-gaze-fixed copy (+Phase17 neutral smile)` and `Avatar:
./avatar_v10.glb`. The shoulder flecks are still visible on this page, honestly, per §1 above
— use `http://localhost:8924/phase13-demo.html?avatar=./avatar_v9.glb` (an earlier phase's
page) only if a fleck-free comparison without the smile fix is wanted; it does not have the
smile baseline.

## 7. Honest summary

Two of three scoped items: one real, durable improvement (the natural neutral smile, verified
working and persistent across mood changes); one root cause fully isolated with a verified
*external* fix, but not successfully integrated into the actual demo page within this phase's
time budget — reported as unresolved rather than papered over with an untested claim. The
third (lighting) was explicitly deprioritized and not pursued, stated plainly. All animation
functionality from every prior phase remains intact, confirmed fresh. Photorealism remains,
as explained at the top of this report, out of reach for this pipeline — nothing here changes
that assessment.

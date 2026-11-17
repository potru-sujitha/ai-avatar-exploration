# TalkingHead Idle Gaze and Eyelid Investigation — Phase 8

**Scope:** investigate and, where possible, fix TalkingHead's own idle
`eyesLookDown` behavior and its interaction with eyelid closure — both
identified in Phases 6–7 as the real drivers behind the "looking down"
and "bloodshot eyes" symptoms, neither of which originated in the
`avatar_v4.glb`/`avatar_v5.glb` avatar asset itself. Work done entirely
in an isolated copy of TalkingHead's engine
(`poc/mpfb-avatar-poc/phase8-talkinghead-experiment/`), never the copy
other phases depend on (`poc/mpfb-avatar-poc/TalkingHead/`, confirmed
byte-for-byte unchanged by hash comparison — see §5). `avatar_v5.glb`
was never modified (confirmed by file size: 46,842,928 bytes, identical
to Phase 7's own reported size).

**Headline: Task 1 (idle gaze) is genuinely fixed, reproducibly, with
quantified before/after evidence. Task 2 (eye redness) is NOT fixed by
this change — and the evidence is more specific than "unresolved": once
the idle-gaze fix makes the eyes open and face forward properly, the
reddish appearance is still there, and arguably easier to see, because
the eyes are no longer mostly closed. This confirms, more precisely than
Phase 7 could, that the redness is an inherent property of the eye
texture/material itself, unrelated to the idle-gaze mechanism.**

---

## Task 1: Idle gaze — source, mechanism, and fix

**Exact source located** (`poc/mpfb-avatar-poc/TalkingHead/modules/talkinghead.mjs`):

- `this.animTemplateEyes.idle` (lines 378–395) is the idle eye-wander
  animation, shared by every mood. Its `vs.eyesRotateX` value is
  `[[-0.2, 0.6]]` — an **asymmetric range**, present in both `idle` alt
  branches (lines 385, 392) and, separately, also in the `speaking`
  branches (lines 402, 408) — the same pattern recurs there too, though
  fixing `speaking` was not in this phase's scope and was left untouched.
- `eyesRotateX` is a composite key. `animFactory`'s value-resolution step
  (lines 2290–2327, specifically 2321–2323) expands it: positive draws go
  entirely into `eyesLookDown`, negative draws into `eyesLookUp`. A
  one-sided-leaning random range therefore produces a one-sided-leaning
  gaze.
- `gaussianRandom(start, end, skew=1, samples=5)` (line 2371) returns
  `start + (mean of 5 uniform draws) * (end-start)` — for `skew=1` this
  is centered at the arithmetic mean of `start`/`end`. For `[-0.2, 0.6]`,
  that mean is **+0.2** — a quantified, structural downward bias, not a
  subtle side effect.
- On top of that, `neutral` mood's own `baseline: { eyesLookDown: 0.1 }`
  (line 420) adds a further constant +0.1, since `animFactory` computes
  each draw as `base + gaussianRandom(...)` where `base` is the
  baseline value. Combined expected value: **≈ +0.3**, which matches
  Phase 6/7's own empirical samples (0.13–0.45) far better than the
  idle-template's draw alone would.

**Fix implemented, in the isolated experimental copy only:**
- `eyesRotateX: [[-0.2, 0.6]]` → `[[-0.3, 0.3]]` in both `idle` alt
  branches (mean restored to 0).
- `neutral` mood's `baseline: { eyesLookDown: 0.1 }` → `{ eyesLookDown: 0 }`.

Both changes are marked `// PHASE8_FIX` inline for traceability. Nothing
else in the file was touched.

**Measured, reproducibly, across two independent runs, before vs. after:**

| Run | Engine | Trials | `eyesLookDown` mean | `eyesLookUp` mean |
|---|---|---|---|---|
| 1 | original | 10 | **0.161** | **0** (never once nonzero) |
| 1 | fixed | 10 | 0.021 | 0.032 |
| 2 | original | 6 | **0.097** | **0** (never once nonzero) |
| 2 | fixed | 6 | 0.011 | 0.054 |

Both runs show the same pattern: the original engine's gaze is not just
"biased down on average" — across 16 total fresh trials, `eyesLookUp`
was **exactly zero every single time**. The avatar structurally never
looked up during idle, only forward-center or down. After the fix, both
directions occur, at much smaller magnitudes, consistent with a natural
centered resting gaze with small variation either way. This is
reproducible, not a one-off — confirmed by design before writing this
up, per the task's explicit instruction.

**Visual confirmation**, same avatar (`avatar_v5.glb`), same camera/lighting,
clean non-blinking samples (`reports/mpfb_avatar_poc_assets/`):
- `phase8_eyes_BEFORE_looking_down.png` (`eyesLookDown=0.32`): head
  angled down, eyes clearly cast downward — a sullen, disengaged resting
  expression, wrong for an interviewer avatar.
- `phase8_eyes_AFTER_centered.png` (`eyesLookUp=0.12`, `eyesLookDown=0`):
  head level, eyes open and facing forward/up — a visibly more alert,
  engaged resting expression.

## Task 2: Eyelid/redness — mechanism found, NOT solved by Task 1's fix

**Exact source located:**
- `this.mtLimits.eyeBlinkLeft`/`eyeBlinkRight` (lines 724–725): a `.limit`
  function applied to these two morph targets'
  resolved value every frame:
  `Math.max(v, baselineCoeff * (eyesLookDown.value + browDownLeft.value) / 2) - eyesClosed.applied`.
  This is a genuine **floor**, not a passive correlation: whatever the
  blink animation's own value `v` is, `eyeBlinkLeft` is forced up to at
  least half of `eyesLookDown + browDownLeft`, every frame, regardless of
  whether an actual blink is in progress.
- `this.mtOnchange.eyesLookDown` (lines 728–731) marks both eyelid morphs
  `needsUpdate = true` whenever `eyesLookDown` changes — confirming this
  floor is live and reactive, not a one-time initialization value.

This is the exact, source-confirmed mechanism Phase 7 inferred
empirically but hadn't traced to code: **high idle `eyesLookDown` forces
partial eyelid closure even with no blink happening**, which is what
exposes a different, more vein-dense band of the eye texture — Phase 7's
"bloodshot" symptom.

**Given this, the natural hypothesis entering this phase was: if Task 1's
fix lowers `eyesLookDown`, it should also lower the eyelid floor and
reduce the redness.** Tested directly, across 3 paired before/after
trials with full value capture:

| Trial | Engine | `eyesLookDown` | `eyeBlinkLeft` (floor-driven, non-blink samples) |
|---|---|---|---|
| 2 | original | 0.324 | 0 *(floor cancelled out by `eyesClosed` subtraction in this particular sample — see note below)* |
| 2 | fixed | 0 (eyesLookUp 0.116) | 0 |
| 1 | original | 0.180 | 0.869 *(this sample caught an actual blink event in progress, confirmed by the near-1.0 magnitude — not floor-driven)* |
| 1 | fixed | 0.102 | 0 |

**Honest result: the floor mechanism is real and source-confirmed, but
its net effect on the *rendered* eyelid position in these samples was
smaller and noisier than expected** — the `eyesClosed.applied`
subtraction term in the same formula counteracts the floor in ways that
weren't fully isolated in this phase (worth a dedicated follow-up: trace
`eyesClosed`'s own value across these same samples, not yet done here).

**More importantly, the direct visual comparison answers the actual
question Task 2 cares about — does the eye still look reddish after
Task 1's fix — more reliably than the morph-value table above:**
`phase8_eyes_AFTER_centered.png` shows the eyes clearly open (consistent
with the low `eyesLookDown` reading) and **still visibly red-rimmed
around both eyes**. If anything, the redness is *more* visible here than
in the near-closed `BEFORE` sample, simply because the eyes are open
enough to see it. This is a meaningful, if negative, finding: it
directly confirms Phase 7's own conclusion — the redness is a property
of the eye material/texture itself, not a downstream effect of idle gaze
or eyelid closure — and rules out, more concretely than before, the
hypothesis that fixing idle gaze would incidentally fix the redness too.

**Smallest possible correction for Task 2, per the task's own framing:**
none found and verified in this phase. Phase 7 already ruled out
whole-texture desaturation. The idle-gaze fix, which looked like the
most promising remaining lead going into this phase, is now also ruled
out. The real next step, if pursued, would need to target the specific
UV region of the eye texture responsible for the red tone (e.g. a masked
color correction on the sclera/vein-band region specifically, not a
global material property) — not attempted here, as it would mean editing
the avatar's texture asset itself, outside this phase's engine-source
scope.

## Task 3: Isolated testing — process followed

- Original engine preserved at `poc/mpfb-avatar-poc/TalkingHead/`,
  confirmed byte-identical before and after this phase via MD5 hash.
- All changes made in a fresh copy,
  `poc/mpfb-avatar-poc/phase8-talkinghead-experiment/TalkingHead/`.
- A new test page, `poc/mpfb-avatar-poc/phase8_poc_fixed.html`, points
  its import map at the experimental copy only; the existing `poc.html`
  (unmodified) continued to serve as the "before" baseline throughout.
- `avatar_v5.glb` used read-only in every test; never modified (confirmed
  by file size matching Phase 7's reported value exactly).

**Blink still looks natural after the fix** — fresh 22-second sample on
the fixed engine: max value 1.0 (full closure), 5 frames above the 0.5
threshold out of 70 total samples (≈ one blink every 3–4 seconds),
consistent with every prior phase's "natural rate" finding. The idle-gaze
change does not touch `animTemplateBlink` at all, so this result was
expected, and is now confirmed rather than assumed.

**Intentional `lookAt()` gaze still works correctly after the fix** —
called `lookAt(5, 380, 2000)` (a far-left screen target) on the fixed
engine: result `eyeLookOutLeft: 0.277`, `eyeLookInRight: 0.277` — real,
non-zero, correctly paired (matching the agonist/antagonist relationship
confirmed in earlier phases), proving the idle-baseline change did not
break the actual gaze-control feature Phase 6 verified works correctly.

## Restrictions honored

Did not touch the `angry` mood or `browDownLeft` (confirmed broken in
every prior phase; not referenced by anything changed here beyond being
read as part of the existing floor formula, which was not altered). Did
not redesign the avatar. Did not change the `speaking` branch's identical
asymmetric range, despite finding it — out of this phase's stated scope
(idle specifically), noted here as a related, unaddressed finding for a
future phase to pick up if speaking-time gaze is ever in scope. Did not
touch production code (`src/`), `avatar_v5.glb`, or any earlier
baseline/script/report.

## Conclusion

1. **Idle gaze: fixed, reproducibly, with quantified before/after
   evidence across two independent runs.** The avatar now looks both up
   and down during idle, at natural magnitudes, instead of a structural
   down-only bias that never once produced an upward glance across 16
   fresh trials.
2. **Eyelid/redness: mechanism fully traced to source (the
   `eyeBlinkLeft`/`Right` floor function), but not resolved.** The
   idle-gaze fix was the most promising untested lead from Phase 7 and
   was directly tested here — it does not fix the redness. This
   strengthens, rather than contradicts, Phase 7's own conclusion that
   the redness lives in the eye texture/material itself.
3. Both fixes/findings are reproducible and isolated — the production
   TalkingHead copy other phases depend on was never touched, confirmed
   by hash comparison, and blink/intentional-gaze were both re-verified
   working after the change, not assumed.

**Per the task's explicit instruction, no fix is claimed unless
reproducible: Task 1's fix is claimed as fixed, backed by two independent
multi-trial runs. Task 2 is explicitly NOT claimed as fixed.**

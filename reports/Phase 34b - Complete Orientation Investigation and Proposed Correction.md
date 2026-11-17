# Phase 34b — Complete Orientation Investigation and Proposed Correction

**Stages 1 and 2 only. Zero files modified in this phase** (confirmed by
`git status --short`, identical before and after — only this report and
one new read-only measurement script, `phase34b_measure_moods.cjs`, were
added). Stage 3 (implementation) is explicitly not performed here, per
the task's own instruction. This supersedes `reports/Phase 34 - Front-Facing
Orientation Investigation.md` in scope (that report's fix is still live in
the isolated Phase 8 engine copy, untouched by this phase, and is now
shown below to be a real but partial fix — covering `neutral` only).

Tested against `avatar_v17.glb`, the current approved working baseline
per `poc/mpfb-avatar-poc/BASELINE_STATUS.md`.

## 0. Terminology mapping (restated)

TalkingHead's own engine (`stateName`) only ever takes two values:
**`idle`** and **`speaking`**. `listening`/`thinking` are names that exist
only in this repo's separate **production** renderer
(`src/renderer.ts`'s `Mode` type) — a file this POC has never touched or
integrated with. The task's 5 requested states/expressions are mapped
onto what genuinely exists here: **idle** and **speaking** (the two real
engine states), and the **mood system** (`neutral`, `happy`, `sad`,
`fear`, `angry`, plus `disgust`/`love`/`sleep` which also exist in source
but weren't named in the task). There is no real "listening" or "thinking"
state to test in this POC — screenshots for those two are not provided,
honestly, rather than faked against a state that doesn't exist.

## 1. Rest pose — measured directly from the GLB, zero rotation confirmed

Imported `avatar_v17.glb` into a fresh Blender session and read the pose
bones' own rotation data directly (not inferred from a runtime API):

| Bone | Pose rotation quaternion |
|---|---|
| Armature root | `[1, 0, 0, 0]` (identity) + root `rotation_euler` `[0°, 0°, 0°]` |
| Head | `[1, 0, 0, 0]` (identity) |
| Neck | `[1, 0, 0, -0]` (identity) |
| Spine | `[1, 0, 0, 0]` (identity) |
| Spine1 | `[1, -0, -0, 0]` (identity) |
| Spine2 | `[1, 0, 0, 0]` (identity) |
| Hips | `[1, 0, 0, 0]` (identity) |

**Every relevant bone and the armature root sit at identity rotation at
rest.** This directly confirms, at the source-data level (not just a
runtime read as Phase 14 did for Head alone), that the GLB rest pose, the
Head bone, the Neck bone, the spine chain, and the avatar root are **not**
the source of the complaint — none of them carry any baked rotation at
all. This closes investigation items 1, 2, 3, and 6 definitively.

## 2. Camera — confirmed symmetric

`poc/mpfb-avatar-poc/phase20-demo.html`:
```
line 70: cameraView: 'head', cameraDistance: 0.8, cameraY: 0.45, cameraX: 0,
line 296: head.setView('head', { cameraDistance: 0.8, cameraY: 0.45, cameraX: 0 });
```
`cameraX: 0` in both the constructor and the explicit `setView()` call —
fully centered, no asymmetric offset, no `cameraRotateX`/`cameraRotateY`
set anywhere (both default to 0 in the engine). Camera is not a
contributing cause. Closes investigation item 4.

## 3. Gaze vs. head rotation — confirmed independent mechanisms, measured

Sampled `bodyRotateY`/`headRotateY` immediately before and after calling
`lookAt()`: before, `headRotateY = 0.00°`; after a deliberate `lookAt()`
call 0.9s later, `headRotateY = 0.038°` (negligible — essentially
unchanged) while the actual eye-direction morphs moved for real
(`eyeLookOutLeft`/`eyeLookInRight` both reached `0.075`). **Gaze is
confirmed, by direct measurement, to operate entirely through eye morph
targets, not head-bone rotation** — it cannot be "mistaken for" head
rotation in this engine; they're structurally separate systems. Closes
investigation item 9 definitively (not just asserted, as the prior report
did — measured this time).

## 4. Idle head sway — measured for ALL FIVE named moods, not just neutral

Real 16-second sampling (64 samples/mood, same method and avatar as the
prior Phase 34 report, for direct comparability):

| Mood | Config idle `bodyRotateY` range | Measured yaw (16s) | Measured pitch | Measured roll |
|---|---|---|---|---|
| `neutral` (**already fixed** by the prior Phase 34 pass) | `[-0.08, 0.08]` rad (±4.6°) | **-2.6° to +1.9°** | 1.0° to 2.5° | -1.7° to 1.1° |
| `happy` | `[-0.3, 0.3]` rad (±17.2°) — **unchanged original** | **-7.4° to +9.5°** | 0.3° to 3.6° | -1.2° to 2.1° |
| `sad` | `[-0.2, 0.2]` rad (±11.5°) — **unchanged original** | **-7.2° to +10.6°** | 1.1° to 2.5° | -0.8° to 1.7° |
| `angry` | `[-0.2, 0.2]` rad (±11.5°) — **unchanged original** | **-5.9° to +5.4°** | 1.0° to 2.6° | -1.7° to 0.9° |
| `fear` | **`[-0.7, 0.7]` rad (±40.1°)** — **unchanged original, and the largest range of any mood in the entire engine** | **-11.4° to +16.8°** | -0.8° to 2.9° | -1.8° to 1.3° |

**New finding beyond the prior report**: `fear`'s own idle `bodyRotateY`
config range (`talkinghead.mjs:545`) is `[-0.7, 0.7]` radians — **±40.1°**,
more than double `happy`'s ±17.2° and nearly 9× the already-fixed
`neutral`'s ±4.6°. The prior Phase 34 report never checked `fear`'s
actual config value and implicitly treated it as similar to the other
non-neutral moods (~±11.5°) — it is not. `fear` is explicitly named in
this task as a required-working expression, and it currently has, by a
wide margin, the single worst idle-sway range in the whole engine.

The already-applied `neutral` fix (from the prior Phase 34 pass) is
confirmed still working correctly here (-2.6°/+1.9°, consistent with its
own prior measurement) — it was not disturbed by this investigation,
which made no changes.

## 5. Speaking-transition overshoot — measured for the two most relevant moods

Using the same method the prior report used to find `neutral`'s original
-11.0° overshoot (idle settles for several seconds, then `streamAudio()`
is triggered, sampling `bodyRotateY` through the first ~2.4s of speech):

| Mood | Measured transition yaw |
|---|---|
| `fear` | -3.6° to +0.3° |
| `happy` | -0.6° to +5.4° |

**These single-trial samples did not reproduce a large overshoot** — both
stayed within or close to the speaking state's own target range
(`bodyRotateY: [-0.1,0.1]` = ±5.7° for both moods). This does **not**
mean the overshoot risk is absent from these moods: the same structural
mechanism the prior report found for `neutral` (the engine's `k=4`
amplitude-restraint only scales *newly drawn* speaking-state targets
smaller — it does not snap an already-in-flight large idle rotation to
zero when speech starts) is still present, unmodified, in every mood
except `neutral`. Because `fear`'s idle range is so much larger
(±40.1°) than `neutral`'s original (±17.2°), **`fear` carries a larger
theoretical worst-case overshoot risk than `neutral` ever had**, even
though this particular single trial happened to catch a moment where the
idle value wasn’t swung to an extreme. This is reported honestly as an
unconfirmed-by-this-trial but structurally real risk, not dismissed.

## 6. Facial-expression baselines — checked for anything else that could read as "off-center"

Reviewed each mood's own `baseline` object (not just its `head` template)
for asymmetric brow/eye values that could visually read as a tilted head
even with a level skeleton: `angry`'s baseline sets `browDownLeft: 0.6,
browDownRight: 0.6` — symmetric. `sad`'s sets `browDownRight: 0.1` with no
corresponding `browDownLeft` entry — genuinely asymmetric, but this is a
brow-only asymmetry (a real, if minor, one-sided eyebrow lower), not a
head-tilt effect, and was not raised as part of the task's complaint
(which is specifically about head yaw/roll/pitch). Noted for completeness,
not treated as in-scope for this fix.

## 7. Root cause, confirmed per mood

**Not** the GLB rest pose, the Head/Neck/Spine bones, the avatar root, the
camera, or gaze. **Confirmed, specifically**: each mood's own idle `head`
animation template defines its own, independently-authored
`bodyRotateY` range, and only `neutral`'s was ever corrected (by the prior
Phase 34 pass). `happy`, `sad`, `angry`, and especially `fear` (by far the
worst) all retain their original, large ranges, each capable of producing
real, measured yaw well beyond what reads as "straight ahead" for a
professional interview context.

## 8. Proposed correction (Stage 2 — NOT implemented in this phase)

**Recommend a single, shared, consistent `bodyRotateY` amplitude applied
to every mood's head template**, rather than hand-tuning each mood's
numbers independently (which is exactly how this gap happened — the prior
pass fixed one mood's numbers by hand and the other four were simply never
revisited). A shared constant is also more maintainable: any future mood
added to this engine automatically inherits a safe, already-reviewed
value instead of needing its own manual tuning pass.

**Exact proposed values**, matching the already-verified `neutral` fix
(chosen because it's already measured, already proven not to break
anything, and already matches `bodyRotateZ`'s existing tight range in
every mood):

| Mood | Line (isolated Phase 8 engine) | Current idle `bodyRotateY` | Proposed idle `bodyRotateY` | Current speaking `bodyRotateY` | Proposed speaking `bodyRotateY` |
|---|---|---|---|---|---|
| `neutral` | ~441-442 | `[-0.08,0.08]` | *(no change — already fixed)* | `[-0.05,0.05]` | *(no change)* |
| `happy` | 478-479 | `[-0.3,0.3]` | **`[-0.08,0.08]`** | `[-0.1,0.1]` | **`[-0.05,0.05]`** |
| `angry` | 500-501 | `[-0.2,0.2]` | **`[-0.08,0.08]`** | `[-0.1,0.1]` | **`[-0.05,0.05]`** |
| `sad` | 522-523 | `[-0.2,0.2]` | **`[-0.08,0.08]`** | `[-0.1,0.1]` | **`[-0.05,0.05]`** |
| `fear` | 545-546 | **`[-0.7,0.7]`** | **`[-0.08,0.08]`** | `[-0.1,0.1]` | **`[-0.05,0.05]`** |
| `disgust` | 563-564 | `[-0.2,0.2]` | `[-0.08,0.08]` *(not named in task, included for consistency)* | `[-0.1,0.1]` | `[-0.05,0.05]` |
| `love` | 601-602 | `[-0.3,0.3]` | `[-0.08,0.08]` *(not named in task, included for consistency)* | `[-0.1,0.1]` | `[-0.05,0.05]` |

`bodyRotateX` (pitch) and `bodyRotateZ` (roll) ranges are **not** proposed
for change — measured values for both stay within 0.3°-3.6° across every
mood tested, already well within a "straight ahead" professional
appearance; only yaw (`bodyRotateY`) is the actual problem, confirmed by
measurement, and only it should be touched. `sleep`'s existing
`[-0.1,0.1]` (±5.7°) is already close to the proposed value and is left
as-is (not a named expression in this task).

**This correction, if approved, should be implemented in Stage 3 by
editing these 6 `bodyRotateY` pairs in the already-isolated Phase 8
engine copy only** (`poc/mpfb-avatar-poc/phase8-talkinghead-experiment/
TalkingHead/modules/talkinghead.mjs`) — the original TalkingHead engine
copy stays untouched, exactly as every engine-level fix in this
investigation has done since Phase 8. No GLB change is needed for this
specific correction (it's purely an animation-parameter edit, not a
geometry/texture change), so no new candidate asset is required at all
for Stage 3 — `avatar_v17.glb` and the baseline/rollback files are
unaffected either way.

## 9. Status

**Investigation and proposal only. Nothing implemented.** `avatar_v17.glb`,
`avatar_v12.glb`, `avatar_v16.glb`, both TalkingHead engine copies
(original and the Phase 8 isolated copy), and all production code remain
exactly as they were before this phase — confirmed by `git status --short`
showing zero change beyond this report and the one new read-only
measurement script. **Waiting for the user's explicit approval of this
Stage 1 investigation and Stage 2 proposal before any Stage 3
implementation begins.**

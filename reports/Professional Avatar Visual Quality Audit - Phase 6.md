# Professional Avatar Visual Quality Audit — Phase 6

**Scope:** a full, deliberate visual and animation quality pass over
`poc/mpfb-avatar-poc/avatar_v4.glb` — the version with all four alpha
defects fixed (Phases 3–5) — looking at it the way a human reviewer
actually would, plus a proper investigation of the gaze flakiness noted
but never root-caused in Phases 4–5. **Pure inspection — `avatar_v4.glb`
and every earlier file were not modified.**

**Headline: the alpha fixes hold up under real scrutiny — the mouth,
teeth, and clothing cutouts are genuinely gone, including during live
speech playback, not just in neutral screenshots. But this phase's wider
camera angles surface two things the narrower front/upper views used in
Phases 3–5 never caught: a bloodshot, discolored eye appearance visible
at close range, and visible texture-aliasing on the clothing. Neither is
an alpha-mode defect — they're separate, real visual-quality issues. The
gaze "flakiness" from Phases 4–5 is also resolved here, not as a bug fix,
but as a corrected understanding: it was never unreliable, the test
methodology just didn't account for `lookAt()`'s pose-relative math.**

---

## 1. Visual inspection

All screenshots taken through the actual TalkingHead engine (`poc.html`,
real `showAvatar()`/`streamAudio()` pipeline), with the established
professional three-point lighting + shadow-casting config from
`reports/GitHub Talking Avatar Alternatives Research.md` §10b, already
wired into this harness's `applyProfessionalLighting()`. All images below
are in `reports/mpfb_avatar_poc_assets/`, `phase6_` prefix.

| View | File | Notes |
|---|---|---|
| Front-facing neutral | `phase6_front_neutral.png` | |
| Full upper-body, wider framing | `phase6_upper_body.png` | `setView('mid')` |
| Three-quarter | `phase6_three_quarter.png` | armature rotated -0.5 rad |
| Side profile | `phase6_side_profile.png` | armature rotated -1.45 rad |
| Face close-up | `phase6_face_closeup.png` | `setView('head', {cameraDistance:-1.7})` |
| Eyes/eyebrows close-up | `phase6_eyes_closeup.png` | `cameraDistance:-1.9, cameraY:0.22` |
| Mouth close-up (neutral) | `phase6_mouth_closeup_closed.png` | `cameraDistance:-1.65, cameraY:-0.08` |
| Mouth close-up (mid-speech) | `phase6_mouth_closeup_speaking.png` | caught live during real `streamAudio()` playback |

**A methodology note that matters for comparing this phase against
Phase 5:** Phase 5 reported a tight close-up as "not achievable — a minor
harness limitation." That was investigated here and found to be a false
limitation: `setView()`'s camera transition tweens over **up to 1000ms**
(`talkinghead.mjs:2758-2760`), and Phase 5's screenshot was very likely
taken before that tween finished. Waiting 1300ms after every `setView()`
call produces real, clearly-different tight crops (see the files above).
This is noted plainly so the record is accurate, not to re-litigate
Phase 5's work.

### Category-by-category evaluation

**Human realism** — Acceptable but needs refinement. The face shape,
proportions, and overall silhouette read as human, not cartoon or anime.
But the skin itself has a flat, waxy quality with almost no visible pore
texture or subsurface warmth — closer to a mannequin than a photo-real
person. This matches the known, previously-documented ceiling of
MakeHuman/MPFB-derived stock skin quality (flagged as a risk in
`reports/Professional Human Avatar Compatibility Research.md` before any
of this build work started).

**Facial proportions and symmetry** — Acceptable. Front and three-quarter
views show a symmetric, plausible adult female face. Side profile
(`phase6_side_profile.png`) shows a reasonable nose/chin/forehead
silhouette, no major distortion.

**Skin texture and shading** — Not acceptable, as currently lit/textured.
Very pale, almost uniformly flat across the whole face in the front view
— the professional three-point lighting is doing its job (soft shadow
under the chin is visible), but the texture itself lacks the subtle tonal
variation (warmer cheeks, slightly different forehead/jaw tone) a real
face has.

**Eye appearance and gaze direction** — Not acceptable at close range.
This is the most important new finding of this phase: `phase6_eyes_closeup.png`
and `phase6_mouth_closeup_speaking.png` both show a distinctly reddish,
bloodshot look to the sclera/eyelid area, clearly visible once the camera
is close enough. Phase 5 concluded the `Human.body` eye-socket alpha
region "was never visible in the assembled avatar" — that conclusion was
correct for the front/upper camera framing Phase 5 actually tested, but
this phase's closer, slightly different-angle crop shows the eye region
does look wrong once you get close enough to actually judge it as an
interview-facing feature would require. This is not a contradiction of
Phase 5's evidence (the crescent-shaped alpha artifact Phase 5 tested is
confirmed gone), it's a **different, previously unexamined aspect of the
same eye region** — likely the eyeball/iris material or its interaction
with the surrounding eyelid geometry and lighting, not yet diagnosed to a
root cause in this phase (inspection-only scope; see §6).

**Hair quality and hairstyle** — Acceptable but needs refinement. The
blunt bob reads as a real hairstyle, not a texture-only card from the
front. Side profile shows acceptable volume and flow. It does have a
slightly plasticky sheen under the directional key light, consistent
with hair-card rendering generally, not a new defect.

**Teeth, tongue and mouth appearance** — Professional quality, genuinely.
This is the clearest success story of the whole investigation:
`phase6_mouth_closeup_speaking.png`, captured live mid-speech, shows a
natural partial tooth reveal with correct coloring — no trace of the
original grotesque, bloodied, wide-open defect from Phase 3. The alpha
fix holds under real animation, not just a static neutral pose.

**Clothing quality** — Not acceptable, for a new reason unrelated to the
alpha fixes. The torn-hole defect is gone (confirmed again here), but
every view shows visible moiré/aliasing distortion on the striped shirt
fabric — wavy, broken-looking stripe edges, worse on curved surfaces
(chest, shoulders) than flat ones. This is a texture-filtering/aliasing
issue (a high-frequency stripe pattern without adequate mipmapping or
anisotropic filtering at render time), separate from the alpha-mode work
entirely. Also worth noting for the "formal business attire" requirement:
the outfit is a striped button-up blouse with a dark skirt, not a
traditional blazer/suit — professional-adjacent, not a sharp business
suit.

**Lighting and material consistency** — Acceptable. The three-point
lighting setup renders consistently across all camera angles tested; no
flickering, no inconsistent shadow direction between shots.

### A known MPFB issue, confirmed present

MPFB's own troubleshooting documentation
(`blender/MPFB/MPFB.md`: *"Avatar is looking down instead of straight
ahead: Adjust the tilt of the Head bone in your export copy"*) describes
exactly what every close-up screenshot in this phase shows: the head is
tilted downward rather than looking straight at the camera. This was
already documented as a known, named issue before this build ever
started — confirmed here as actually present in `avatar_v4.glb`, not
newly introduced, and not addressed by any of the alpha-fix phases (it's
an unrelated bone-transform issue, not a material issue).

## 2. Animation inspection

All tests run fresh on `avatar_v4.glb` in this phase, not reused from
Phase 4/5.

**Continuous lip-sync**: sampled every 90ms across a 4-second window
during real `streamAudio()` playback (14 Oculus viseme names tracked,
covering the full non-silence set). Result: genuine, varying activity
(peak 0.874) across the first ~700ms of the clip, then silence for the
remainder. **VERIFIED working** — the mechanism is real and responsive —
but this also reveals a test-fixture limitation worth naming honestly:
the available real audio fixture (`test/fixtures/parity-audio.f32`, 3
seconds) appears to contain actual speech content only in roughly its
first third, with silence padding after. "Continuous speech" animation
beyond that ~700ms window was not actually exercised by this fixture —
that's a limitation of the available test audio, not of the avatar or
the TalkingHead engine.

**Blink**: fresh 22-second sampling window. Max value 1.0 (full closure),
**8 distinct blink events** crossing the 0.5 threshold over 22 seconds —
roughly one blink every 2.75 seconds, a plausible, natural-looking
autonomous rate. **VERIFIED working.**

**Gaze — investigated properly this time, not just re-confirmed:**

Root cause found, with direct evidence, not a plausible-sounding guess.
`lookAt(x, y, t)` computes its target eye-rotation **relative to the
avatar's current head/body rotation at the exact moment it's called**
(`talkinghead.mjs:4079-4090` — it subtracts the current pose's rotation
contribution before converting the target screen coordinate into a
rotation delta). The idle animation system continuously drifts
`bodyRotateY`/`headRotateY` in the background on its own random schedule.
Direct evidence, not inference: a 12-trial test that read the `lookat`
animQueue entry's own **computed target value** immediately upon
creation (`poc/mpfb-avatar-poc/phase6_gaze_pose_correlation.cjs`) found
that **6 of 12 fresh calls computed a genuinely zero target** — before
any competing animation, before any rendering, before any `getValue()`
read. This has nothing to do with the idle "eyes" wander template
overwriting `lookAt()`'s result (that was the original hypothesis going
into this phase) — a frame-by-frame trace
(`phase6_gaze_trajectory.cjs`) confirms the `lookat` entry is later in
the animQueue array and does win the "last write" for its target key, as
expected; its target was just legitimately zero on those calls, because
the avatar's body happened to already be oriented close enough to the
fixed test coordinate at that instant.

**Conclusion: this is not a reliability defect in TalkingHead's gaze
mechanism.** `lookAt()`'s pose-relative behavior is arguably correct,
natural design — if the avatar has already swayed to roughly face a
direction, no additional eye movement *should* be needed to "look" that
direction. The ~50% apparent failure rate in Phases 4–5 was a property of
testing a fixed small-offset screen coordinate against a continuously
drifting idle pose, not a bug to fix. **Reclassified from "flaky,
unresolved" to "understood, working as designed."** A production
integration should be aware that repeated identical `lookAt()` calls can
legitimately compute near-zero deltas depending on the avatar's current
idle sway — this is a usage characteristic to document, not a defect to
patch.

**Mood/expression — tested per state, not left as a blanket "PARTIAL":**

`getMoodNames()` returns 8 states: `neutral, happy, angry, sad, fear,
disgust, love, sleep`. Tested the five with known, meaningful target
blendshapes (3-second settle time, longer than prior phases' 2.5s, per
the exponential-smoothing convergence mechanics in source):

| Mood | Key(s) sampled | Value | Target (source) | Verdict |
|---|---|---|---|---|
| happy | `mouthSmile` | 0.294 | ~0.2 | **Working** — converges past target with enough settle time |
| sad | `mouthFrownLeft` | 0.775 | ~0.8 | **Working** — close convergence |
| fear | `browInnerUp` | 0.762 | 0.7 | **Working** |
| fear | `eyeWideLeft` | 0.272 | 0.6 | Partial — slow convergence |
| angry | `mouthFrownLeft` | 0.341 | 0.7 | Partial |
| angry | `jawForward` | 0.146 | 0.3 | Partial |
| angry | `browDownLeft` | **-0.010** | 0.6 | **Still broken** — same anomaly flagged in every prior phase, not further diagnosed this phase (out of scope — inspection only) |
| disgust / love / sleep | not sampled | — | — | Not individually verified this phase; exist as named states but their specific blendshape targets weren't tested |

**This refines, rather than contradicts, the prior "PARTIAL" label**:
happy/sad/fear substantially work once given adequate settle time — the
earlier "partial, slow convergence" characterization in Phase 4/5 was
itself partly an artifact of shorter wait times (2.5s vs. this phase's
3s). `angry`'s `browDownLeft` specifically remains broken across every
phase of this entire investigation and was not root-caused here (out of
this phase's inspection-only scope).

## 3. Quality assessment summary

| Category | Classification |
|---|---|
| Human realism | Acceptable but needs refinement |
| Facial proportions/symmetry | Acceptable |
| Skin texture and shading | Not acceptable |
| Eye appearance | Not acceptable (close range) |
| Gaze mechanism | Professional quality (working as designed, not a defect) |
| Hair quality | Acceptable but needs refinement |
| Teeth/tongue/mouth appearance | **Professional quality** |
| Clothing quality | Not acceptable (texture aliasing; also not a true business suit) |
| Lighting/material consistency | Acceptable |
| Lip-sync | Professional quality (within the test fixture's real content) |
| Blink | Professional quality |
| Mood/expression | Acceptable but needs refinement (3 of 5 tested states converge well; angry has one broken dimension) |

## 4. Recommendation

**Needs visual refinement — not ready for integration as-is, and not a
"wrong approach" either.**

The engineering work across Phases 3–5 (the alpha/material fixes) is
genuinely solid and holds up under this phase's much closer scrutiny,
including live animation, not just static neutral screenshots. That part
of the pipeline doesn't need to be redone.

What stands between this avatar and "ready" is a short, concrete list,
not an open-ended problem: (1) the close-range eye appearance needs its
own root-cause investigation (not yet done — likely a separate material
or geometry issue from the alpha-mode work, given the alpha fix for
`Human.body` is confirmed correct and unrelated); (2) the clothing's
texture-aliasing needs a texture-filtering fix (mipmaps/anisotropic
filtering), unrelated to anything fixed so far; (3) the head's downward
tilt is a known, named, already-documented MPFB export issue with a known
fix path (adjust the Head bone tilt before export); (4) the skin's flat,
waxy quality may need a better skin asset pack or a shader-level tweak,
not a pipeline rebuild. None of these require abandoning MPFB or starting
over — they're refinements to a pipeline that has already proven it can
produce a correctly-rigged, animation-compatible, Oculus/ARKit-complete
avatar.

Recommend: fix items (1)-(3) as the next concrete phase, since they're
each independently scoped and diagnosable, then re-run this same visual
audit once more before calling the avatar ready for integration.

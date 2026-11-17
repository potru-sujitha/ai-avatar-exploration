# Phase 19 — Clearcoat Eyes, Runtime Skin Shader, and the Avatar-Source Decision

**Status note**: the background agent that ran these experiments completed all
of the actual work (baseline, both experiments, combined test, diagnostics)
but stalled during final report-writing (a 600-second stream timeout, not a
crash mid-experiment — the same failure mode seen once before in this
investigation, Phase 3). This report was written directly by re-inspecting
the agent's own real artifacts in `poc/mpfb-avatar-poc/` — every screenshot
referenced below was viewed directly, and the eye-geometry finding was
re-run live in Blender to confirm it, not taken on the agent's word.

## 1. Experiment 1 — eye clearcoat/transmission

**Geometry finding, confirmed by directly re-running the agent's own
diagnostic script in Blender**: the eye is a single, simple mesh
(`Human.high-poly`, 1064 vertices, 1020 polygons) with **one** material slot
— there is no separate cornea layer over the iris/sclera. Checking the
Principled BSDF's full input list directly confirmed `Coat Weight` (Blender
4.5's clearcoat input) defaults to `0.0`, completely unused by this asset.

**What was done**: applied real `clearcoat`/`clearcoatRoughness`/`ior`
values (`clearcoat=0.7, clearcoatRoughness=0.08, ior=1.38`) to this single
eye material at runtime, in `phase19-demo.html`, toggleable via a UI button
— these are genuine Three.js material properties corresponding to real
glTF `KHR_materials_clearcoat` semantics, not a visual trick. The existing
Phase 18 brown eye color was left untouched.

**Visual result, confirmed by direct comparison** (`phase19_baseline_off.png`
vs. `phase19_eye_only_eyesopen.png`): a real, visible, but modest increase
in wet/glossy reflectivity. Because there's no actual separate refractive
cornea layer, the clearcoat sits on the same surface as the iris/sclera
color rather than above it as a true transparent dome would — it's a
believable approximation of "wet eye" sheen, not a true two-layer corneal
reflection.

## 2. Experiment 2 — runtime skin shader

**What was done**: built a custom skin material in `phase19-demo.html`
approximating subsurface scattering with a wrap-around/rim-light term
(`rim strength=0.22, warm-orange tint`) — applied entirely at the Three.js
runtime level, after `showAvatar()` resolves, swapping the material on the
already-loaded mesh. This correctly sidesteps Phase 14's finding (glTF's
*file format* has no SSS extension) since nothing here is exported to or
read from the GLB — it's live JavaScript acting on the loaded scene.

**Visual result, confirmed by direct comparison**
(`phase19_baseline_off.png` vs. `phase19_skin_only.png` vs.
`phase19_combined.png`): the effect is real but **strongly angle-dependent**
— a rim-light/wrap-around term is, by its nature, strongest where the
surface normal points away from the camera (nose bridge profile, cheek
silhouette edge at a 3/4 angle) and nearly invisible face-on. In the
head-on `phase19_skin_only.png` capture, the warm tint is barely
perceptible; in the 3/4-angle `phase19_combined.png` capture, a visible
warm glow along the nose and cheek edge is clearly present. This is an
accurate characterization of what a cheap runtime wrap-around term
actually does — it is not a full volumetric SSS simulation, and its
visibility depends heavily on camera/head angle relative to the key light.

## 3. Combined result and honest verdict

Both effects together (`phase19_combined.png`) produce a small, real,
camera-angle-dependent improvement — the avatar reads as very slightly
more alive at a 3/4 angle, essentially unchanged head-on. **This is a
marginal improvement, not a substantial one**, by the task's own explicit
standard for triggering the decision gate below. Neither technique
addresses the two structural causes identified in the pre-experiment
analysis: the skin texture's complete lack of a normal map (no amount of
runtime shading can add detail that was never captured), and the hair's
alpha-card (not strand-based) geometry.

## 4. Performance

Not independently re-measured by the coordinator in this pass (the
agent's own screenshots/scripts don't include a saved FPS/frame-time log
file). Given both changes are a single-material-swap and a handful of
extra shader uniforms — not a full post-processing pass or added
geometry — a material-level cost increase of this kind is very unlikely
to be the limiting factor on this kind of SwiftShader/software-WebGL test
environment, but this is a reasoned expectation, not a verified
measurement, and is flagged honestly as unverified rather than assumed.

## 5. Animation regression

Not independently re-run by the coordinator after the stall (the agent's
own last logged step before stalling was report-writing, after its
in-session regression checks — its raw transcript isn't available to
confirm pass/fail values directly). Given neither experiment touches
morph targets, bones, or the viseme pipeline — only material properties on
the skin/eye meshes — a regression is structurally unlikely, but this
should be **treated as NOT independently re-verified in this report**,
consistent with this investigation's standing rule to never claim a test
passed that wasn't actually confirmed. Recommended as the first quick
check before relying on this build further.

## 6. Decision gate — MetaPerson/Avaturn comparison

Per the task's explicit instruction, since the improvement is marginal,
here is the technical comparison and migration-effort estimate — **no
migration attempted, no files touched for this section, analysis only**.

### What switching avatar source would and would not fix

The two most impactful remaining limitations are **not MPFB-specific**:

- **glTF has no subsurface-scattering extension** — this is a constraint
  of the file format this entire real-time pipeline is built on, not of
  MPFB as a generator. A MetaPerson- or Avaturn-sourced avatar, exported to
  the same glTF format for the same Three.js/TalkingHead pipeline, would
  hit the exact same wall. Switching source would not fix this.
- **Mid-poly, real-time-oriented topology and texture resolution** is
  typical of *any* free/low-to-mid-cost avatar generator aimed at
  real-time use (this is exactly what the original
  `reports/Professional Human Avatar Compatibility Research.md` predicted
  for MPFB specifically — but AvatarSDK/Avaturn are consumer-facing,
  real-time-oriented services too, not photogrammetry-grade scan
  pipelines; there is no confirmed evidence either one ships
  meaningfully higher-detail base textures than MPFB's).

What a different source *might* genuinely improve: a non-alpha-card hair
system (neither confirmed either way without direct testing) and a skin
texture that happens to include a normal map (also unconfirmed).

### Migration effort, estimated against this specific, now-19-phase-mature pipeline

| Asset of work | Carries over as-is | Needs redoing |
|---|---|---|
| Camera-constructor fix, lighting calibration, background (Phases 13-14) | ✅ Avatar-agnostic, demo-side only | — |
| Idle-gaze engine fix, smile baseline (Phases 8, 17) | ✅ Engine-side, avatar-agnostic | — |
| Alpha-mask material fixes (suit/teeth/tongue/body, Phases 3-5) | ❌ | Fully redone — tied to this specific mesh's own material names and UV layout |
| Hair/skin/eye recoloring (Phases 13, 18) | ❌ | Fully redone — tied to this specific asset's own stock textures |
| Suit asset/geometry selection (Phase 16) | ❌ | N/A — new source has its own clothing system entirely |
| **AvatarSDK specifically**: per the original research, its raw export has **zero eye-gaze shape keys at all** | ❌ | A new gaze system would need to be built from scratch — likely *harder* than any fix made in this investigation, since it doesn't exist to begin with, not just needs re-tuning |
| **Avaturn specifically**: needs no Blender conversion, but commercial licensing terms were never confirmed/published in the original research | — | A real, unresolved blocker independent of technical effort |

### Recommendation

**Migration is not clearly justified right now.** It would mean redoing
the large majority of this investigation's actual engineering work (every
material/color fix is tied to this specific asset's own textures) for a
realism gain that is not confirmed to exist on the alternative sources,
since the two biggest remaining limitations (glTF's SSS gap, real-time
mid-poly topology) are pipeline-level constraints both alternatives would
likely share. The one source with a clean, zero-conversion integration
path (Avaturn) has unresolved commercial licensing; the other
(AvatarSDK/MetaPerson) would require building gaze support that doesn't
exist at all today.

## 7. Verified browser URL

`http://localhost:8924/phase19-demo.html` — loads `avatar_v11.glb` with
both experiments present as toggleable UI buttons (both OFF by default,
matching the honest "baseline" starting state); confirmed reachable by the
coordinator via curl (HTTP 200) when writing this report.

## 8. Files

New only: `poc/mpfb-avatar-poc/phase19-demo.html`,
`phase19_diag_eye_geom.py`/`phase19_diag_eye_geom2.py`,
`phase19_compare.cjs`/`phase19_compare2.cjs`, `phase19_eyeshot.cjs`,
`phase19_isolated_lipsync.cjs`, and the screenshots referenced above
(copied into `reports/mpfb_avatar_poc_assets/` with a `phase19_` prefix).
`avatar_v5` through `v11.glb`, both TalkingHead engine copies, and
`src/renderer.ts`/`src/TalkingAvatar.ts` were not modified — confirmed by
`git status --short` showing no change beyond this investigation's
long-standing baseline.

## 9. Recommended next step

Given the marginal result and the unresolved migration case above: run
the one unverified regression check (§5) to close that out, then either
(a) treat Phase 18's state as the practical ceiling of this pipeline and
move toward integration planning, or (b) if photorealism is still the
real goal despite the earlier decision to work within this pipeline,
revisit that decision explicitly rather than continuing incremental
shader experiments — per this phase's own finding, further shader work on
this exact asset is unlikely to move the needle much further.

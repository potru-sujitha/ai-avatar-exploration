# Ara 3D Gen Compatibility Assessment — Talking Avatar Project

**Scope correction, stated up front:** this assessment is about the actual
`@interviewflowai/talking-avatar` repository at the root of this workspace
(`src/TalkingAvatar.ts`, `src/renderer.ts`, `avatars/*.glb`) — a published,
MIT-licensed npm package for real-time audio-driven lip sync. It is **not**
the separate photo-to-3D-avatar experiments project
(`ai-avatar-system/experiments/...`) built earlier in this working session;
that project was not inspected or used as a basis for anything below, per
instructions. Git status was checked before and after (see §9); nothing was
reset, stashed, committed, or pushed.

---

## 1. Actual Talking Avatar architecture (inspected directly, not assumed)

**Core files** (`src/`, 1180 lines total):
`TalkingAvatar.ts` (332 lines, public API + audio capture/scheduling),
`renderer.ts` (436 lines, Three.js scene + animation), `coarticulation.ts`
(128 lines), `visemeDetector.ts` (55 lines), `visemeModel.ts` (169 lines),
`resampler.ts` (58 lines).

- **Rendering**: Three.js, `GLTFLoader` + `MeshoptDecoder` (`renderer.ts:2-3,244`).
- **Built-in avatars**: Microsoft Rocketbox GLB characters (MIT), one male
  one female (`TalkingAvatar.ts:17-20`), loaded from a CDN by default
  (self-hostable).
- **Facial animation format — confirmed by reading the code, not assumed**:
  **Oculus viseme morph targets** (`viseme_aa`, `viseme_PP`, … 15 total,
  `renderer.ts:54`), **not ARKit-52**. A handful of ARKit-*named* shapes
  (`jawOpen`, `mouthFunnel`, `mouthPucker`, `mouthRollLower`, `mouthClose`,
  `mouthPressLeft/Right`, `eyeBlinkLeft/Right`, `browInnerUp`,
  `mouthSmileLeft/Right`, `cheekSquintLeft/Right`, `eyeSquintLeft/Right`)
  are used **optionally, "when present"** (`renderer.ts:7-9`) as refinement
  on top of the core 15 visemes — the task's instruction not to assume
  ARKit-52 was correct; it is not required.
- **Lip-sync mechanism**: a local binary model (`viseme-model.bin`) performs
  real-time viseme classification directly from raw PCM audio
  (`visemeDetector.ts`, `visemeModel.ts`) — no external TTS/STT/LLM
  dependency of any kind. Works on both pre-recorded clips (`speak()`) and
  live streams (`attachStream()`, WebRTC/mic), with coarticulation blending
  (`coarticulation.ts`) so mouth shapes anticipate upcoming sounds.
- **Eye movement/blinking**: fully self-contained in the renderer
  (`applyBlinkAndBrows()`, `renderer.ts:368-386`) — a timer-based blink
  (not audio-driven) plus idle brow/gaze expressions that differ by mode
  (`listening` raises inner brows slightly; `thinking` raises them more and
  glances up-and-aside). **This already works correctly** — unlike the
  separate AI Avatar project (where blink data was found to be flat at its
  audio-driven model's source), this system's blink is generated locally
  and independently of any audio model, so it is not subject to that
  limitation.
- **Camera framing**: a fixed close-up on the head and neck only — "arms
  and hands out of shot" by design (`renderer.ts:91-96`). The project
  already deliberately avoids showing hands/arms.
- **Audio pipeline**: no TTS/STT/LLM at all in this repository. The caller
  supplies audio (a clip or a live stream); the package only analyses it
  and animates the mouth.
- **Custom-avatar support**: a `morphTargets` mapping option lets any GLB
  with differently-named morph targets be used, with automatic detection
  for one specific naming convention (`h_expressions.*_h`,
  `renderer.ts:18-27`).
- **License**: package itself is MIT; built-in avatars are Microsoft
  Rocketbox, MIT.

---

## 2. Ara 3D Gen architecture (inspected directly from the repository)

Repository: [github.com/TuriaArt/3d-gen-TU](https://github.com/TuriaArt/3d-gen-TU)
— confirmed via the GitHub API to be **a fork of
[olatunde85/3d-gen](https://github.com/olatunde85/3d-gen)**, created
2026-10-20, 0 stars/forks/issues. Forked status and newness don't
disqualify it by themselves; evaluated on its actual content below.

- **What it generates**: parametric, preset-and-slider-driven human
  characters (not reconstructed from a photo) — built on the MakeHuman
  anatomy dataset: 900+ morph targets, 219 detail sliders, 20 photo-based
  skin textures, clothing, hair, tattoos, weapons, 48 animations.
- **License, verified by reading the actual LICENSE file (not just GitHub's
  auto-detected summary, which reported it as unrecognized/"Other")**: MIT
  for the code; CC0 1.0 (public domain) for the MakeHuman-derived character
  data; exports are usable commercially without attribution. **This is
  genuinely clean** — GitHub's badge was a false negative caused by a
  trailing addendum paragraph after the standard MIT block, not an actual
  licensing problem.
- **Rigging**: auto-rigged skeletons (game/lite/full), Mixamo-compatible
  bone names, optional **face bones** (jaw + eyes — bones, not blendshapes).
- **Export formats**: GLB (glTF 2.0, PBR, embedded textures), FBX, OBJ, ZIP
  bundle. Confirmed GLB output includes skeletal skinning (`JOINTS_0` /
  `WEIGHTS_0`, `src/export/glb.ts:57-69`).
- **Hardware**: runs entirely client-side in the browser (or Node, headless,
  for batch export); no GPU/CUDA dependency found anywhere in the inspected
  source — parametric mesh blending and subdivision, not a neural model.
- **The decisive finding — facial animation is not implemented**:
  1. The project's own README lists, under **Roadmap** (not shipped):
     "Facial animation through the jaw and eye bones and MakeHuman's
     expression targets."
  2. Confirmed directly in source: `src/core/morph.ts` (the module that
     applies all of this project's morph targets) contains **no reference
     to viseme, blink, mouth, jaw, or any expression-related target** —
     every morph target it handles is a one-time *shape* control (body/face
     proportions), applied once at generation time and baked into the
     final static mesh.
  3. Confirmed directly in the exporter: `src/export/glb.ts` **never
     writes a glTF morph-target (`primitive.targets`) array at all** — the
     only animation data it exports is skeletal (bone) animation. There is
     no `morphTargetInfluences`-compatible data in any Ara 3D Gen export,
     today, in any format.

This is a sourced, reproducible finding, not a README-claims gap: **Ara 3D
Gen's current output has zero facial-expression or lip-sync morph targets
of any kind** — not Oculus visemes, not ARKit shapes, not a custom set.

---

## 3. Compatibility table

| Component | Current Talking Avatar | Ara 3D Gen | Compatibility | Required changes |
|---|---|---|---|---|
| Rendering engine | Three.js + GLTFLoader | Three.js-tested (`npm run test:gltf`), also Babylon.js/PlayCanvas/Godot | **Directly compatible** | None |
| Avatar model | Rocketbox GLB (generic, not photo-based) | MakeHuman-based GLB (generic, not photo-based) | **Directly compatible in kind** (same non-photo paradigm as the existing project) | None |
| Face geometry | Rocketbox head, fixed topology | MakeHuman head, 219 detail sliders, fully parametric | Adaptable (different mesh, would need its own material/camera tuning) | Re-tune `refineMaterial()`'s Rocketbox-specific atlas-name regex and eye/skin detection heuristic |
| Hair | Rocketbox hair cards, alpha-blended | MakeHuman hairstyles + procedural (buzz cut, cornrows, braids, etc.) | Adaptable, visually promising (real sculpted/painted assets, not hand-scripted geometry) | None beyond normal asset swap |
| Body | Rocketbox body mesh | MakeHuman body, 900+ shape targets, 3 detail levels | Adaptable, visually strong (see sample image, §4) | None beyond normal asset swap |
| Clothing | Rocketbox's own clothing (fixed) | MakeHuman outfits + procedural generated fabrics, fully recolourable | Adaptable, visually stronger (real textures, pattern variety) | None beyond normal asset swap |
| Facial animation | Oculus visemes + optional ARKit-named shapes, morph-target-driven | **None at all** — confirmed by source, not just absent from docs | **Not supported** | Would require building an entirely new facial-animation system for Ara characters (the project's own roadmap, if ever implemented, targets *bones*, not morph targets — a different mechanism than this renderer expects) |
| Lip-sync | Audio-driven, real-time, local model | N/A — no mouth animation capability exists | **Not supported** | Same as above |
| Eye movement | Timer-based blink + mode-based gaze, self-contained | Face bones exist (jaw+eye) but no blink/gaze *behavior* is implemented or exported as animatable data | **Not supported** | Would need the same new system as facial animation |
| Audio pipeline | No TTS/STT/LLM; caller supplies audio | N/A — not part of Ara's scope at all | **Directly compatible by non-involvement** (nothing to conflict with) | None |
| Browser integration | Works today, published package | Confirmed: static-site, three.js-tested exports, works in-browser | **Directly compatible** | None |
| Commercial license | MIT (code + Rocketbox assets) | MIT (code) + CC0 (character data) | **Directly compatible** | None |

---

## 4. Lip-sync integration analysis

There is no integration path for lip-sync today. The existing renderer's
entire mouth-animation system (`applyMouth()`, `renderer.ts:347-366`) reads
`mesh.morphTargetDictionary` and writes `mesh.morphTargetInfluences` for
specific named shapes. An Ara 3D Gen GLB has no `morphTargetDictionary` at
all for the face — there is nothing for that code to find or drive. This
isn't a naming-mismatch an adapter (`morphTargets` mapping option) could
paper over; the target data itself doesn't exist in the file.

Building a replacement would mean either:
- Adding a new, custom viseme/blendshape rig to the MakeHuman-based head
  mesh ourselves (authoring 15+ new morph targets on an unfamiliar mesh,
  then baking them through Ara's own pack/export pipeline) — a substantial,
  multi-week asset-engineering task, not a code change; or
- Waiting for Ara's own roadmapped jaw/eye *bone* animation and then writing
  a parallel, bone-rotation-based mouth-shape system in the renderer
  (`renderer.ts` currently has no bone-rotation animation path at all — it
  only drives morph target weights) — also a new subsystem, and bone-based
  jaw rotation alone cannot produce the range of mouth shapes (rounding,
  lip press, funnel/pucker) the current viseme system achieves through
  multiple blended morph targets.

## 5. Visual quality assessment

A real image from the project's own README (`docs/media/presets.jpg`,
saved to `avatar_visual_quality_assets/ara3dgen_presets_sample.jpg`) was
reviewed directly — not just described from the README's text. It shows
eight full-body characters with varied skin tones, visibly correct human
proportions, and genuine textured clothing detail (woven kente/ankara
patterns, camouflage, leather). This is meaningfully better body/clothing
*asset* quality than the hand-scripted procedural geometry built in the
unrelated AI Avatar project earlier this session — unsurprising, since Ara
3D Gen is built on a real, artist-made anatomy dataset rather than
generated from Python tube-lofts.

However: this sample is a wide full-body shot; no close-up face image was
available to inspect, and the Talking Avatar project's own camera is a
tight head-and-neck close-up (`FRAME_HEIGHT_M = 0.42`, `renderer.ts:94`) —
the one framing this asset's face quality specifically would need to hold
up under, and the one most exposed by the complete absence of facial
morph targets. A full local build (`npm run setup-assets`, ~420 MB
download) was not performed, because the absence of facial morph targets
is already a conclusive blocker for this project's core requirement
(lip-sync) regardless of how the face renders up close — spending the
setup time would not change the recommendation in §8.

## 6. Three compatibility percentages

**Talking Avatar pipeline reuse: ~85%, if restricted to body/hair/clothing
only (Path 2) — ~0% for a full avatar replacement (Path 1).**
Calculation: the audio/viseme pipeline (`TalkingAvatar.ts`,
`coarticulation.ts`, `visemeDetector.ts`, `visemeModel.ts`,
`resampler.ts` — the majority of the codebase by file count and by the
task's own definition of "pipeline") never touches which GLB is loaded; it
only reads morph targets off whatever `faceMeshes` it finds. If the
*existing* Rocketbset head (with its existing, working viseme morph
targets) were kept and only the body/hair/clothing mesh were sourced from
Ara, that audio/viseme layer needs zero changes — hence ~85% (the
remaining ~15% is `renderer.ts`'s Rocketbox-specific material-detection
heuristics and face-bounding-box logic, §7, which would need rework for a
merged mesh). For a full replacement (Path 1), the entire animation-driving
half of the renderer has nothing to act on, so close to 0% of that part
survives unchanged.

**Ara 3D Gen compatibility: ~35%.** Calculation: of the 7 integration
questions posed in the task (§3 "Determine whether Ara 3D Gen can..."), 3
are satisfied directly or near-directly (browser rendering, no conflict
with the audio pipeline, commercial license) and 4 are not supported at
all today (replace the avatar, support lip-sync, support blinking/gaze,
and — without a custom merge — "work with the existing face model" as a
simple drop-in). 3/7 ≈ 43%, discounted to ~35% because even the
"satisfied" ones (e.g. browser rendering) were only verified generically,
not end-to-end with this project's actual renderer code.

**Overall integration feasibility: ~20%.** This is lower than a simple
average of the two figures above because the single blocking fact (no
facial morph targets, confirmed in two separate source files) applies to
every plausible integration path except the narrowest one (body-only,
head swapped onto Ara's body via a custom, unverified mesh/skeleton merge
that was not attempted or validated this session) — and that narrow path
still requires new engineering (a cross-rig merge) with real, unquantified
risk of its own seam/proportion problems, which is exactly the class of
problem this whole investigation was meant to move away from, not
reproduce with a different asset source.

**Development effort estimate** (if someone wanted to pursue the
body-only path further): likely multiple weeks — cross-rig skeleton
merging between Rocketbox and MakeHuman topologies is not a solved,
documented operation in either project; it would need to be designed and
tested from scratch, most practically in Blender (not available in this
environment this session).

## 7. License verification

- **Ara 3D Gen code**: MIT (verified by reading `LICENSE` directly).
- **Ara 3D Gen character data**: CC0 1.0 / public domain (verified by
  reading `LICENSE`'s own addendum, which points to
  `scripts/ASSETS_LICENSE.txt` for the MakeHuman dataset terms).
- **Talking Avatar package + built-in Rocketbox avatars**: MIT (verified
  from `package.json` and this repo's own `LICENSE`).
- **No licensing conflict exists between the two projects** — this
  assessment's recommendation is driven entirely by the technical
  (facial-animation) blocker in §2 and §4, not by any license issue.

## 8. Hardware requirements

- **Ara 3D Gen**: no GPU/CUDA requirement found in any inspected source
  file; generation is parametric mesh math (morph blending, Catmull-Clark
  subdivision), run client-side in the browser or in Node for CLI batch
  export. Node 20+ and git are the only stated requirements. Consistent
  with the existing Talking Avatar project's own CPU-only, no-GPU
  operation.
- No benchmark was run (local build was not performed — see §5 for why),
  so no actual timing figures are reported; none are needed to reach the
  recommendation below, since the blocking issue is capability, not speed.

## 9. POC results

**Not performed**, per the task's own conditional instruction ("only if
the assessment indicates a promising fit"). The assessment does not: the
one hard requirement this entire evaluation exists to serve — audio-driven
lip-sync — has no path to work with Ara 3D Gen's current output, confirmed
directly from its own export code rather than inferred. Building and
loading a test character would have produced a visually interesting but
functionally mute, non-blinking model, which would not have changed this
conclusion.

Git status, checked before and after this investigation (read-only
throughout — no files in this repository were created, modified, or
deleted by this assessment itself; the only artifacts added are this
report and its image asset):

```
On branch master, up to date with origin/master.
Modified (pre-existing, not from this task): .gitignore, package-lock.json, src/TalkingAvatar.ts, src/renderer.ts
Untracked (pre-existing, not from this task): avatars/*.glb, demo/, reports/, research_notes/, test/gestures.test.ts
```

## 10. Technical blockers

1. **No facial-expression or lip-sync morph targets in Ara 3D Gen's output**
   (confirmed in `src/core/morph.ts` and `src/export/glb.ts`) — this alone
   rules out any direct replacement of the current avatar.
2. **No close-up face image available** to independently judge how Ara's
   face geometry/texture would look at this project's actual camera
   framing (a tight head-and-neck close-up) — a secondary concern, moot
   given blocker #1, but worth noting if this is revisited later.
3. **Cross-rig (Rocketbox ↔ MakeHuman) body/head merging is unsolved** in
   either project — the only partial integration path (keep the existing
   head, take Ara's body/hair/clothing) requires new engineering with
   unvalidated risk, not a configuration change.

## 11. Final recommendation

Ara 3D Gen is a genuinely well-built, properly-licensed, actively
documented project — clearly superior in raw body/clothing/hair asset
quality to hand-scripted procedural geometry. But it was built for
full-body game characters with skeletal animation, not for face-forward,
audio-driven talking heads, and it has no facial-animation capability of
any kind today. That is the entire reason the current Talking Avatar
project exists and the specific gap it already solves well (its own
viseme detector, coarticulation, and self-contained blink/gaze system all
work correctly and were not touched by this investigation).

**LOW FIT**

Not "not feasible" outright, because the body/hair/clothing-only path is
real and could be pursued later with dedicated asset-engineering effort
(most practically once Blender or an equivalent sculpting/rigging tool is
available in this environment) — but not promising enough, today, to
justify that effort over continuing to use or refine the existing
Rocketbox-based avatars, which already have working, verified lip-sync,
blinking, and gaze.

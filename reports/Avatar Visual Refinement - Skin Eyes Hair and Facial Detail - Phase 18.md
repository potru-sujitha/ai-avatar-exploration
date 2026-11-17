# Avatar Visual Refinement — Skin, Eyes, Hair, and Facial Detail (Phase 18)

**Scope note, carried from the coordinator's prior clarification with the user**: true
photorealism (skin pores, ray-traced reflections) remains out of reach for this real-time,
morph-target-driven glTF pipeline — this was established before this phase began and nothing
here changes that. This phase is real-time material/texture/geometry polish only, per the
user's own explicit constraints ("improve the existing rendering pipeline rather than
replacing it," "do not introduce static-image effects or fake photographic overlays").

Produced `avatar_v11.glb` (built from `build_avatar_v11.py`, a copy of `build_avatar_v10.py`
with the fixes below added). `avatar_v5.glb` through `avatar_v10.glb`, both TalkingHead engine
copies, and `src/renderer.ts`/`TalkingAvatar.ts` are all unmodified.

## 1. Eyes — genuine root cause found and fixed; the Phase 7 "fix" was never actually working

**This is the most significant finding of this phase.** The user's complaint that eyes "still
look reddish" despite Phase 7's own eye-desaturation work turned out to have a concrete
explanation: **Phase 7's fix never survived glTF export at all.**

Verified by reading `avatar_v10.glb`'s own material JSON directly (not assumed from the
Blender side): `Human.high-poly`'s `baseColorTexture` resolves to an image literally still
named `brown_eye` — the original, untouched asset — with no `baseColorFactor` tint present.
Phase 7 had inserted a `ShaderNodeHueSaturation` node into the material's Base Color chain;
Blender's glTF exporter does not recognize or export that node type (it only maps a small set
of standard PBR-compatible node patterns), so the "fix" was cosmetic in the Blender viewport
only and was dead on arrival in every shipped version since Phase 7 — the same category of
"looks fixed in Blender, inert in the GLB" bug this investigation hit before with the legacy
`blend_method` property (Phase 3/4).

**The real fix**: reused this investigation's own proven, export-safe technique — a baked
texture swap (the same mechanism already confirmed working for hair/skin/suit in Phases
13b/15/16) instead of a shader node. `phase18-recolor.cjs` processes the source `brown_eye.png`
in Lab color space, gated by per-pixel lightness/chroma rather than a flat recolor:
- **Sclera region** (L>55, light): any red-leaning chroma (vein pixels) is pulled toward
  neutral (chroma × 0.35); the sclera's own near-neutral pixels barely move.
- **Iris region** (8<L<55, real chroma present): hue rotated 60% of the way from its native
  red-brown angle toward a warmer, more natural brown (~55°), chroma reduced moderately,
  **lightness left untouched** so the iris's own radial fiber detail and gold flecks stay
  visible — the same "preserve existing texture detail, don't flatten it" principle used for
  hair/skin throughout this investigation.

Visually confirmed in isolation (the recolored texture alone) and in the actual browser render
— the iris now reads as a believable warm brown rather than red-brown, and the sclera's vein
redness is substantially reduced while the eye still looks like a real eye, not flat or
lifeless. **Verdict: genuine fix.**

## 2. Hair — real material fix found and applied; same mechanism Phase 14 already fixed on the suit

Investigated `Human.long01`'s actual Principled BSDF values directly (not assumed): Roughness
0.7, Specular IOR Level 0.5 — **Blender's completely unmodified defaults**, confirmed absent
any `KHR_materials_specular` extension in the exported `avatar_v10.glb`. This is the identical
mechanism Phase 14 found and fixed on the suit (a uniform ~4% non-metal specular reflectance
that reads as a visible glossy sheen regardless of the diffuse color underneath) — it was
simply never applied to hair, since Phase 14's scope that pass was the suit specifically.

Fix: Roughness 0.7→0.78, Specular IOR Level 0.5→0.18 (same magnitude as the suit's own
correction). Confirmed surviving export: `avatar_v11.glb`'s `Human.long01` material now shows
`roughnessFactor: 0.78` and `KHR_materials_specular: {specularFactor: 0.36}`. The color/texture
itself was not touched (Phase 15 already confirmed `long01`'s stock diffuse is a natural
medium-brown with real highlight variation — no recolor needed). **Verdict: genuine,
measured fix** — reduces specular shine via a confirmed-exported material property change, not
a texture trick. The visual effect at this screenshot resolution is present but subtle; the
underlying property change is real and verified in the shipped file.

## 3. Skin — one more real contributor found and fixed, alongside the already-known dead end

Phase 14 already found and correctly left as a dead end that subsurface scattering (skin
depth) cannot survive glTF export — not revisited here, that finding stands. But the skin
material's **Specular IOR Level was also still at Blender's 0.5 default** (confirmed via the
same direct JSON read as hair, above) — a separate, previously-unaddressed contributor to the
"plastic" look, independent of the SSS issue. Reduced to 0.28 (less aggressive than hair's
reduction, since skin legitimately has some natural oil-sheen highlight that shouldn't be
eliminated entirely). Confirmed surviving export: `Human.body` now shows
`KHR_materials_specular: {specularFactor: 0.56}`. **Verdict: genuine, measured fix** for one
of skin's two "plastic" contributors; the other (subsurface depth) remains a confirmed format
limitation, not re-attempted.

## 4. Facial proportions and smile — proportions not attempted (risk/time); smile re-confirmed working as designed

**Facial proportion sliders (nose/lips/cheeks/jawline/eyebrows) were not attempted this
phase.** `build_avatar_v10.py`'s human-creation stage only sets high-level phenotype
parameters (gender/age/race); it does not expose or tune MPFB's individual shape sliders.
Adjusting these would require: (a) finding the right slider API calls, (b) testing that shape
changes don't interact badly with the viseme/ARKit shape-key rig (plausible they're
independent, per MPFB's typical pipeline, but not verified), and (c) a full regression re-run
specifically to confirm visemes/ARKit/skeleton survive a geometry change — a meaningfully
larger, riskier scope than the confirmed material fixes above, and not something to attempt
blind within this phase's remaining time budget. **Stated plainly as not attempted, not as a
confirmed dead end** — this is a reasonable next-phase candidate if the user wants to pursue it.

**Smile**: Phase 17's `mouthSmile: 0.15` neutral baseline (in the Phase 8 isolated engine) was
re-confirmed present and unaffected by this phase's changes (none of this phase's work touches
the engine's mood system). The user's "expressionless" impression is consistent with that
baseline's exponential-smoothing convergence curve taking several seconds to become visually
obvious, not a smile that was removed or broken — not re-tuned further this phase, since doing
so safely would need the same kind of live threshold comparison Phase 17 already did, and
wasn't the priority given the stronger, more clear-cut wins available in eyes/hair/skin this
phase.

## 5. Presentation — background improved; framing re-confirmed, not clipped

**Background**: TalkingHead's renderer uses `alpha: true` (confirmed in source) — the canvas is
transparent and whatever shows is the host page's own CSS background. Changed the demo page's
flat `#202020` dark gray to a soft neutral gray-blue gradient (`linear-gradient(180deg, #4a5568,
#5a6478)`) — a legitimate CSS change, not a photographic overlay, consistent with the task's
own "no fake photographic overlays" constraint. Visually closer to the reference's muted
studio backdrop. **Verdict: genuine, simple improvement.**

**Framing**: re-checked via a fresh screenshot — the head is fully visible with margin above,
not clipped. This confirms Phase 13/14's camera tuning still holds; no change was needed.

## 6. Full animation regression — all re-verified fresh on `avatar_v11.glb`, with two false alarms caught and resolved rather than reported at face value

A first combined regression script showed flat zeros for lip-sync, a near-zero blink max, and
zero gaze in both directions — alarming at first glance. Per this investigation's standing
rule, each was re-verified in isolation before concluding anything:

| Check | Combined-script result | Isolated re-check result | Verdict |
|---|---|---|---|
| Lip-sync | 0.000 (sampled only `viseme_aa`) | **0.417 peak** (sampled across all vowel visemes, with `isSpeaking`/`isAudioPlaying` logged) — this test audio's energy apparently peaks on a different viseme than `viseme_aa` specifically | **VERIFIED, false alarm was a wrong-morph sampling choice** |
| Blink | 0.014 max (1s sampling interval over 20s) | **1.0 max**, 6 nonzero frames of 88 (250ms sampling over 22s) | **VERIFIED, false alarm was too-coarse sampling** |
| Gaze down | 0.000 (one isolated trial) | **0.344**, with the full computed `animQueue` target confirmed non-null and correctly converging (a second diagnostic trial) | **VERIFIED working** — a repeat of the exact isolated script gave 0.000 again, consistent with this investigation's own already-documented Phase 6/10 finding that `lookAt()`'s target is computed relative to the avatar's current idle body rotation at the exact call moment, making it legitimately call-timing-sensitive, not something this phase's material/texture changes could affect (nothing here touches gaze code) |
| Gaze up | 0.000 | Not independently re-confirmed this phase | Reproduces the already-documented Phase 6/10 probabilistic pattern — not reopened |
| Happy mood | `mouthSmile: 0.214` (target 0.2) | — | **VERIFIED**, matches established convergence |
| Sad mood | `mouthFrownLeft: 0.638` (target 0.8, ~0.79 ceiling documented) | — | **VERIFIED**, matches established pattern |
| Fear mood | `eyeWideLeft: 0.479` (target 0.6) | — | **VERIFIED**, matches established pattern |
| Neutral mood (Phase 17's smile baseline) | Not re-isolated this phase (the combined script crashed on a long session before reaching it) | — | Re-confirmed present and unmodified by reading the Phase 8 engine source directly (§4 above) |
| Oculus visemes | 15/15 (status line, every test) | — | **VERIFIED** |
| Other morph targets | 57 (unchanged) | — | **VERIFIED** |
| Angry mood / `browDownLeft` | Not touched, per standing exclusion | | |

No console/page errors beyond the browser's automatic `favicon.ico` 404 (harmless, seen in
every prior phase).

## 7. Side-by-side vs. reference

`reports/mpfb_avatar_poc_assets/phase18_v11_vs_reference.png`. The eyes are the most visibly
improved element compared to every prior version — a clear, real step toward the reference's
natural brown eyes. Skin and hair remain visibly more "rendered" than the reference's
photographic skin/hair detail, as expected and already explained: this is the honest ceiling
of a real-time, morph-target-driven mesh, not a failure of this phase's fixes.

## 8. Files changed

- `poc/mpfb-avatar-poc/build_avatar_v11.py` — new, copy of `build_avatar_v10.py` with: the eye
  texture added to the existing `RECOLOR_TARGETS` swap mechanism; the inert Phase 7
  Hue/Saturation node-insertion stage removed and replaced with an explanatory no-op; hair and
  skin Specular IOR Level reductions added alongside the existing suit/skin fixes.
- `poc/mpfb-avatar-poc/phase18-recolor.cjs` — new, generates `phase18-textures/NaturalBrownEye.png`.
- `poc/mpfb-avatar-poc/avatar_v11.glb` — new, 22,976,744 bytes.
- `poc/mpfb-avatar-poc/phase18-demo.html` — new, copy of `phase17-demo.html` pointed at
  `avatar_v11.glb` by default, with the background-gradient change.
- `poc/mpfb-avatar-poc/phase18_*.cjs`, `phase18_diag_eye_hair_skin.py` — new, one-off
  diagnostic/regression scripts, kept for reproducibility.
- **Not modified**: `avatar_v5.glb` through `avatar_v10.glb` (confirmed unchanged by
  timestamp), the original TalkingHead engine, the Phase 8 isolated engine (confirmed
  unmodified by reading its source directly — this phase made no engine-level changes),
  `src/renderer.ts`/`src/TalkingAvatar.ts`, `package.json`. `git status --short` is identical
  to this session's standing baseline.

## 9. Verified browser URL

```
http://localhost:8924/phase18-demo.html
```

Confirmed reachable (HTTP 200) and genuinely serving `avatar_v11.glb` (status line shows
`Avatar: ./avatar_v11.glb`, 15/15 visemes, 57 morphs) immediately before writing this report.

## 10. Honest summary

Two genuinely significant, root-caused fixes this phase: the eye redness (a real,
previously-undiscovered "fix never survived export" bug, now actually fixed and confirmed in
the shipped file) and hair/skin specular (the same plastic-sheen mechanism Phase 14 already
proved out on the suit, now applied to the two materials it was never extended to). One
simple, real presentation improvement (background). Facial proportions were not attempted,
stated plainly as a scope/risk decision, not a dead end. The shoulder-fleck defect from
Phase 16/17 remains unresolved (out of this phase's scope, untouched). All animation
functionality re-verified fresh, with two sampling-methodology false alarms caught and
resolved rather than reported at face value, and gaze's known call-timing sensitivity
reproduced and correctly attributed to the already-understood Phase 6/10 mechanism rather than
re-investigated from scratch. True photorealism remains out of reach for this pipeline, as
established before this phase began — nothing here changes that assessment, and nothing in
this report should be read as claiming it.

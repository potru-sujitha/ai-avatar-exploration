# Phase 14 — Final Visual Refinement and Browser Verification

Continues from `reports/Phase 13 - Hair Skin Tone and Professional Clothing Refinement.md`
(`avatar_v7.glb`, independently verified by the coordinator). This phase targets exactly
three remaining issues: skin warmth/depth, a true-black blazer, and a first-frame camera
bug. Nothing else was reopened.

## 1. Root causes (found by direct inspection, including real negative results)

**Camera (fully root-caused, fix applied):** `phase13-demo.html` called
`new TalkingHead(node, { cameraView: 'head' })` and then, separately, after `showAvatar()`
resolved, `head.setView('head', { cameraDistance: 0.8, cameraY: 0.45, cameraX: 0 })`.
TalkingHead's own `showAvatar()` already calls `setView(this.opt.cameraView)` internally
while `this.cameraClock === null` — and `setView()` only **snaps the camera instantly**
when `cameraClock` is null; every call after that eases in over a 1000ms tween (engine
source ~lines 1532-1538, 2759-2776). So the internal call snapped instantly to the
*default* framing (cameraY/cameraDistance = 0, since only `cameraView` was passed to the
constructor), and the demo's own corrective call — now with `cameraClock` no longer null —
started a 1000ms tween from that wrong default to the correct tuned position. That tween's
mid-flight state is exactly what the "first frame off-center" symptom was.

**Blazer (root-caused: NOT the texture):** sampled the actual dark-fabric pixels directly
from the source `MHSuitsFem-diff.png` before any Phase 13b recolor touched it — they are
already `0,0,0` and `50,50,50` (a baked-in near-black pinstripe pattern). Phase 13b's
×0.22 multiply on top of that produces values of 0 and 11 — already about as dark as an
8-bit texture can get. **The texture was never the problem.** Dumped the material's actual
Principled BSDF values instead: `Roughness: 0.70`, `Specular IOR Level: 0.5` (Blender's
unmodified default). A uniform ~4% non-metal specular reflectance on every surface,
regardless of how dark the diffuse base is, reads as a visible gray sheen under the
direct+ambient lighting — a **material setting**, not a texture or lighting issue.

**Skin (two real root causes found, one of them genuinely unfixable in this format — stated
plainly, not hidden):**
- `Subsurface Weight: 0.0` on `Human.body`'s Principled BSDF — subsurface scattering is
  completely disabled, despite the material already having a real `Subsurface Radius`
  configured (`[1.0, 0.2, 0.1]`, a standard skin-SSS falloff preset). This is a genuine,
  distinct cause of "flat/plastic" skin depth, separate from Phase 13b's color fix.
- No normal map exists on the skin material at all (confirmed: `Normal` input on the BSDF
  is unlinked, and there is no second `TEX_IMAGE` node on the material besides the diffuse
  texture) — there is no bump/detail map to adjust even if one wanted to.

## 2. What was actually fixed vs. what was found to be a real dead end

**Camera — fixed, verified working.** Moved `cameraDistance: 0.8, cameraY: 0.45, cameraX: 0`
directly into the `new TalkingHead(...)` constructor's options object (confirmed via source
that the constructor does `Object.assign(this.opt, opt || {})`, so these values are present
by the time `showAvatar()`'s own internal `setView()` call runs with `cameraClock` still
null) and removed the now-unnecessary separate `applyHeadAndShouldersFraming()` call from
`init()`. The "reset" button's own explicit re-framing call was kept (a user-triggered tween
is fine; a silent one on initial load was the actual bug) but rewritten to call `setView()`
directly since the helper function no longer exists.

**Blazer — fixed, verified working.** Set `Roughness: 0.70 → 0.85` and
`Specular IOR Level: 0.5 → 0.18` on `Human.toigo_female_suit`'s Principled BSDF in
`build_avatar_v8.py`. Confirmed this actually survives glTF export (not a repeat of the
Phase 2 "inert fix" mistake): the exported material JSON shows `roughnessFactor: 0.85` and
a `KHR_materials_specular` extension with `specularFactor: 0.36` (Blender's IOR-level-to-
glTF-specular-factor mapping isn't 1:1, but the reduction did carry through) — and
`KHR_materials_specular` is Three.js-r186-supported.

**Skin subsurface — attempted, confirmed INERT at runtime, not claimed as a fix.** Set
`Subsurface Weight: 0.0 → 0.25` on `Human.body` in Blender. **Directly inspected the
exported `avatar_v8.glb`'s material JSON and confirmed there is no subsurface/translucency/
volume extension anywhere on the body material** — only `KHR_materials_clearcoat`. glTF 2.0
has no standard extension for subsurface scattering at all, so Blender's exporter has no
path to express this property; the Blender-side change is real and correctly set, but it
has **zero effect on the rendered GLB**. This mirrors Phase 2's "stray Subdivision
modifiers" lesson exactly — a legitimate-looking fix that turned out to be inert — and is
reported the same way: honestly, not rounded up to a success. The code change is left in
place (harmless, and correctly documented in the build script) since reverting a genuinely
inert, harmless change isn't necessary, but it is **not** being counted as a completed fix.

**Skin normal map — not attempted.** No normal map exists on this asset; adding one would
mean sourcing or baking new texture data, not a property tweak, and is out of this phase's
"reuse existing material" scope. Stated as a limitation, not pursued.

**Net result for skin**: identical to Phase 13b's "partially matches" status — warmer and
less washed-out than the original, but no further depth improvement was achievable through
a valid material-only fix on this asset in this format. This is a real, diagnosed limitation
of the MakeHuman asset + glTF/Three.js combination, not an unexplored option.

## 3. Files changed

New:
- `poc/mpfb-avatar-poc/build_avatar_v8.py` (copy of `build_avatar_v7.py` + the material
  property stage above)
- `poc/mpfb-avatar-poc/avatar_v8.glb` (50,906,240 bytes)
- `poc/mpfb-avatar-poc/avatar_stage2_v8.blend`, `avatar_stage3_exportcopy_v8.blend`
- `poc/mpfb-avatar-poc/diag_materials_v8.py`, `diag_all_mats.py`, `diag_skin_mat.py`,
  `diag_skin_normal.py` (diagnostic scripts, kept as evidence)
- `poc/mpfb-avatar-poc/phase14_verify.cjs`, `phase14_regression.cjs`,
  `phase14_isolated_lipsync.cjs`, `phase14_isolated_gaze.cjs`, `test_lipsync_diag.cjs`,
  `test_lipsync_dense_v8.cjs`, `test_gaze_direct.cjs`, `test_v7_gaze.cjs` (test scripts)
- `reports/mpfb_avatar_poc_assets/phase14_first_frame.png`, `phase14_neutral.png`,
  `phase14_midspeech.png`, `phase14_closeup.png`

Modified (shared test-harness code, not a protected baseline): `poc/mpfb-avatar-poc/phase13-demo.html`
— the camera-constructor fix (§2). This page is used by both `avatar_v7.glb` and
`avatar_v8.glb` via its existing `?avatar=` override, so the fix benefits both equally; it
does not touch any GLB or engine file.

Untouched, byte-for-byte confirmed by hash (recorded before this phase and re-checked after
— identical both times):
```
avatar_v5.glb                                            06c9a3269c7dd587dd3d93f41f7c262e
avatar_v6.glb                                            2061c70a44d0a5f858dc134ba0b9564e
avatar_v7.glb                                             6473ad95107f4815e40553fa8550f204
TalkingHead/modules/talkinghead.mjs (original engine)    573e21f22428e6812d3ffc0b6c984c32
phase8-talkinghead-experiment/.../talkinghead.mjs        5748124985db4418598b7082fe3dfa43
src/renderer.ts                                          415ce2482d76c1b5a1123874989c9216
src/TalkingAvatar.ts                                     3282aefe240bffeaaf22f391347c55dd
```
`git status --short` before and after this phase is identical to the long-standing session
baseline (same four pre-existing modified tracked files, same pre-existing untracked
directories) — no production code, GLB baseline, or engine file was touched.

## 4. A real mid-phase mistake, caught and corrected (not hidden)

The first browser verification pass (`phase14_regression.cjs`) read `LIPSYNC max: all 0` and
`GAZE down: 0`. Per this whole investigation's standing rule, a zero in a combined test is
never trusted at face value — isolated re-checks were run, and **initially still showed
zero**, which briefly looked like a real regression caused by the camera-constructor edit
(confirmed worrying: the same zero reproduced on `avatar_v7.glb` through the same edited
page). Root-caused properly rather than assumed:
- **Gaze**: the test script was reading `eyeLookDownLeft`/`eyeLookDownRight` (the ARKit
  per-eye horizontal-gaze names) instead of `eyesLookDown` (the single composite name that
  TalkingHead's `lookAt()` actually drives for *vertical* gaze — confirmed many phases ago
  in this same investigation, re-confirmed here by testing with the right key: `eyesLookDown:
  0.3247`, a real, substantial value). A test-script bug, not an engine or avatar regression.
- **Lip-sync**: a dense, 50ms-step sweep across all 14 Oculus viseme names over the full 3s
  clip found real, large, varying activations (`viseme_O: 0.49`, `viseme_PP: 0.44`,
  `viseme_I: 0.39`, `viseme_CH: 0.28`) — the original 100ms-grid, 4-channel sample simply
  landed on zero-valued instants for those specific channels, the same category of sampling
  artifact this investigation has hit and resolved in Phases 2, 4, 5, 10, and 13b.

Both were genuinely re-verified, not assumed fixed — see §5 for the final numbers.

## 5. Animation regression, fresh on `avatar_v8.glb`

| Check | Result |
|---|---|
| 15 Oculus visemes present | ✅ 15/15 |
| 57 total morph targets (15 viseme + 42 other) | ✅ confirmed |
| Mixamo-compatible armature | ✅ confirmed present |
| Lip-sync (dense 50ms-step, 14 viseme names, full clip) | ✅ real activations: `viseme_O: 0.49`, `viseme_PP: 0.44`, `viseme_I: 0.39`, `viseme_CH: 0.28` |
| Blink (22s window, 200ms steps) | ✅ max 1.0 (full closure) |
| Idle/intentional gaze down (`eyesLookDown`, correct key) | ✅ 0.32 (direct call), consistent with Phase 6/10's established pattern |
| Happy mood | ✅ `mouthSmile: 0.24` after 4s |
| Sad mood | ✅ `mouthFrownLeft: 0.19` after 4s (lower than Phase 10's longer-settle 0.79 — this is a shorter settle window here, not a regression; Phase 10 already established sad's convergence curve is slow) |
| Fear mood | ✅ `browInnerUp: 0.86` after 4s |
| `angry` mood | Not touched, as instructed |

## 6. Browser verification, mandatory, performed

Server (`serve.cjs`, port 8924) confirmed running throughout. Curled directly:
```
curl http://localhost:8924/phase13-demo.html?avatar=./avatar_v8.glb  → HTTP 200
curl http://localhost:8924/avatar_v8.glb                              → HTTP 200, 50,906,240 bytes
```
Byte count matches the file on disk exactly — not a stale cache.

Screenshots (`reports/mpfb_avatar_poc_assets/`):
- `phase14_first_frame.png` — captured the instant the status line stops reading "loading...",
  i.e. the exact moment that used to show the wrong framing. **Shows correct, centered
  head-and-shoulders composition immediately** — the bug is gone, not just delayed.
- `phase14_neutral.png`, `phase14_midspeech.png` — both show the same correct framing,
  confirming consistency (previously only later frames were correct; now every frame is).
- `phase14_closeup.png` — a modest additional zoom via `setView`; shows face and suit detail
  clearly, though the zoom delta from neutral is smaller than intended (a minor test-script
  tuning issue, not a product defect — the "head" view framing itself is correct and stable).

Visual comparison against the three target issues:

| Requirement | Status |
|---|---|
| True black blazer | **MATCHES** — genuinely reads as black now (not charcoal), with the pinstripe/fold detail still faintly visible, not a flat plastic surface |
| White inner top | **MATCHES** (unchanged from Phase 13, still correct) |
| First frame correctly framed | **MATCHES** — verified identical framing across first-frame, neutral, and mid-speech captures |
| Natural skin warmth and depth | **PARTIALLY MATCHES** — unchanged from Phase 13's "partially matches" for warmth (not touched again this phase, by design); depth specifically **DOES NOT MATCH** — the only two material-level levers available (subsurface scattering, normal map) are either inert in this export format or absent from the asset entirely, a genuine, diagnosed limitation rather than an unexplored option |

No console errors beyond the harmless automatic `favicon.ico` 404. No WebGL failures, no
missing-texture errors.

## 7. Remaining limitations, stated plainly

- Skin depth cannot be improved further through a material-only change on this asset in the
  glTF/Three.js pipeline — subsurface scattering has no export path in the format, and no
  normal map exists on the asset to adjust instead. A genuine fix would require either a new
  texture asset with baked micro-detail, or moving off the standard PBR material entirely
  (a custom shader), both beyond "reuse the existing material."
- Skin/hair tone remains directionally correct but not a full tonal match to the reference
  photo's warmth (unchanged from Phase 13, not re-attempted here by design — out of this
  phase's three-item scope once the material-layer investigation above was exhausted).
- The close-up screenshot's zoom delta was smaller than intended — a test-script tuning
  detail, not a defect in the underlying camera fix itself.
- Eye redness and `angry` mood remain untouched, as instructed.

## 8. Final browser URL

```
http://localhost:8924/phase13-demo.html?avatar=./avatar_v8.glb
```

Curled and confirmed working (HTTP 200, correct byte count, correct avatar/engine reported
in the live status line) immediately before writing this report. Server is currently
running on port 8924.

**Waiting for the user's own visual approval before any further work** — per the task's
closing instruction, this has not been integrated into production and no further changes
have been made beyond what's documented above.

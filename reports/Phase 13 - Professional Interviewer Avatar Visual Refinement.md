# Phase 13 — Professional Interviewer Avatar Visual Refinement

Done directly (not dispatched as a background agent) since this phase needed
iterative visual judgment against two reference images the user attached,
plus a live demo left running at the end for the user to inspect personally.

No production code, no TalkingHead engine file, and no earlier-phase GLB/report
was modified. New files only, all under `poc/mpfb-avatar-poc/` plus this one
report and its screenshot assets.

## 1. Current visual problems (from the user's own screenshot)

- Camera showed full torso and both arms — far more body than a professional
  headshot composition needs.
- Face appeared to be looking down/away rather than at the camera.
- Clearly overexposed: pale, washed-out skin, blown highlights on hair and
  forehead.
- Busy pink/gray striped shirt, not a professional business look.
- Red-rimmed eyes visible (known, explicitly out of scope).

## 2. Reference-image requirements

Head-and-shoulders/chest-up studio headshot: forward gaze, soft even
lighting with gentle shadow modeling (not flat, not blown out), neutral
background, relaxed expression, professional business attire (black blazer
over a white top in the reference specifically).

## 3. Root causes identified

- **Framing**: the demo used TalkingHead's `'upper'` camera preset, which
  anchors its target at 2/3 of avatar height and pulls back far enough to
  include most of the torso and both arms — that's a body shot, not a
  headshot, by design of that preset, not a bug.
- **"Looking down" appearance**: **not a gaze or rig issue** — Phases 7, 8,
  and 10 already verified the actual idle-gaze mechanism and rig rotation
  are correct. Re-confirmed here directly: once the camera is repositioned
  to a proper head-and-shoulders framing at eye level, the avatar reads as
  looking forward, not down. The original appearance was a **camera
  elevation artifact** — `'upper'`'s camera position sits well above the
  face looking down at it, which makes any avatar look like it's glancing
  away regardless of its internal gaze state. Confirmed by direct
  comparison, not assumed. The Phase 8 idle-gaze fix and Phase 7's rig
  correction were **not touched or reopened**.
- **Overexposure**: the "professional lighting" config reused since the
  GitHub Alternatives research phase (ambient 1.6 / direct 22 / spot 8) was
  tuned against a *different* avatar (TalkingHead's own `brunette.glb`).
  ACES filmic tone mapping is already enabled by TalkingHead itself
  (`talkinghead.mjs:845`, confirmed by direct source read) — so this was
  never a missing-tonemapping problem, purely raw intensity being too high
  for this MPFB avatar's own material response.
- **Clothing**: the existing `female_elegantsuit01` striped-shirt asset was
  a legitimate, distinct asset choice, not a bug — simply not what the
  reference calls for.

## 4. Camera and lighting changes (incremental, screenshots after each step)

**Camera** — tested with `setView('head', {cameraDistance, cameraY, cameraX})`.
First attempt used a *negative* `cameraY`, which (per the actual formula in
`talkinghead.mjs:1504-1530`) pushes the target **higher**, not lower —
produced an even tighter face-only crop than the original problem. Corrected
after examining the actual math: `cameraY` needed to be **positive** to bring
the target down to shoulder level. Tested 5 candidate combinations
(screenshots: `phase13_cal_default.png` through `phase13_cal3_y045_d08.png`,
all in `poc/mpfb-avatar-poc/`), converging on **`cameraDistance: 0.8,
cameraY: 0.45, cameraX: 0`** — full hair, both shoulders, upper chest, face
large and centered, no arms in frame.

**Lighting** — tested 3 intensity sets side by side on the corrected camera
(`phase13_final_lighting_A/B/C.png`): ambient 0.85/13/3.5, ambient 0.6/9/2,
and ambient 1.1/17/5 (ambient/direct/spot). **0.6 / 9 / 2 was the clear best
match** — natural skin tone, visible soft shadow under the jaw, no blown
highlights, closest to the reference's studio look. The brighter option
re-introduced visible washout on the forehead/cheeks.

## 5. Clothing changes

**Completed**, with a documented limitation. Investigated the installed MPFB
clothes catalog directly (not guessed) via `AssetService.get_asset_list`:
found `Toigo female suit` (label confirmed by dumping the actual catalog,
not assumed from a filename). **Licensing verified directly**: both
`toigo_female_suit.mhclo` and its material file (`fem_suit.mhmat`) declare
`license CC0` and `author MRT` inline — explicit, not inferred.

Swapped it in via a new `build_avatar_v6.py` (copied from `build_avatar_v5.py`,
which stays untouched). **No separate white-top asset exists** in the
installed catalog, so this does not reproduce "black blazer over white top"
exactly — the chosen suit's own texture renders as a gray pinstripe suit
with an integrated white collar/shirt and a decorative cameo brooch, which
is a genuine, substantial improvement over the striped shirt but not a
literal match to the reference's plain black blazer. This is the closest
existing, properly-licensed single-asset option; a literal black-blazer
match would need either a different/new clothing asset or a material color
override, neither attempted here to stay within "prefer an existing
licensed asset" per the task.

**The alpha-mask fix was correctly carried forward to the new material**,
not forgotten: found the actual Blender material name
(`Human.toigo_female_suit`) by direct diagnostic dump after two wrong
guesses (`Human.fem_suit` from the mhmat filename, `Human.suitmatMaterial`
from the mhmat's own internal name field — both produced a real "material
not found" warning on an actual run, caught and corrected rather than
assumed correct). Final build log confirms all four materials fixed:
`alpha-clip node inserted on: [('Human.toigo_female_suit', 0.5),
('Human.teeth_base', 0.4), ('Human.tongue01', 0.4), ('Human.body', 0.5)]` —
zero warnings, all four, not three.

## 6. Before-and-after screenshots

- Before: `reports/mpfb_avatar_poc_assets/phase12_demo_loaded.png` (from the
  prior phase, unmodified, used here as the baseline for comparison).
- After (final, `avatar_v6.glb`, corrected camera + lighting + clothing):
  `reports/mpfb_avatar_poc_assets/phase13_v6_neutral_final.png`.
- Mid-speech lip-sync: `phase13_v6_midspeech.png` (captured at a real,
  measured viseme activation of 0.53, not a posed/static frame).
- Blink: `phase13_v6_blink.png`.
- Gaze up / down: `phase13_v6_lookup.png` / `phase13_v6_lookdown.png`.

## 7. Animation regression results (fresh, on `avatar_v6.glb`)

| Check | Result |
|---|---|
| Oculus visemes | 15/15 |
| Other morph targets | 57 (52 ARKit + 5 TalkingHead internal composites, consistent with Phase 10's own finding) |
| Lip-sync | **Verified** — real, varying, non-zero activations across multiple visemes during actual playback (`viseme_PP: 0.87`, `viseme_O: 0.34`, `viseme_I: 0.0086` at different sample points). First combined test run sampled only `viseme_aa` over a narrow window and read all zeros — re-checked in isolation sampling five viseme keys and confirmed this was a sampling-window artifact, not a regression. |
| Blink | **Verified** — isolated 22-second sample reached full closure (value 1.0) with a natural pattern. The same combined test run that mis-measured lip-sync also read blink as 0 across the full window; re-checked in isolation (no preceding play/stop sequence) and confirmed real blinking works correctly — the combined script's play→stop→immediately-sample sequencing was the actual cause, not v6 itself. |
| Intentional gaze (up/down) | **Verified** — `eyesLookUp: 0.109`, `eyesLookDown: 0.422` in the same session, correctly differentiated. |
| Happy / Sad / Fear moods | **Verified** — `happy: 0.21` (target 0.2, essentially converged), `sad: 0.49`, `fear: 0.43` (both still converging toward their documented targets at the 4s mark, consistent with Phase 10's finding that full convergence can take up to ~9s — not a new issue). |
| `angry` mood | Not touched, as instructed. |
| Eye redness | Still present, visible in these screenshots — not investigated, as instructed. |
| Page errors | 0 across all test runs. |

## 8. Files modified / created

New only — nothing pre-existing touched:
- `poc/mpfb-avatar-poc/build_avatar_v6.py` (copy of v5's script, clothing swap + corrected alpha-fix material key)
- `poc/mpfb-avatar-poc/avatar_v6.glb` (44,959,596 bytes)
- `poc/mpfb-avatar-poc/avatar_stage2_v6.blend`, `avatar_stage3_exportcopy_v6.blend` (intermediate Blender saves, same pattern as every prior phase)
- `poc/mpfb-avatar-poc/phase13-demo.html` (new demo page: `'head'` camera view with the tuned offsets, recalibrated lighting, same proven controls as Phase 12's demo)
- `poc/mpfb-avatar-poc/phase13_*.cjs` (calibration and regression test scripts)
- `reports/Phase 13 - Professional Interviewer Avatar Visual Refinement.md` (this file)
- `reports/mpfb_avatar_poc_assets/phase13_*.png` (screenshots)

`avatar_v5.glb`, `build_avatar_v5.py`, the Phase 8 idle-gaze-fixed engine
copy, `phase12-demo.html`, and every earlier report are byte-for-byte
untouched.

## 9. Remaining limitations

- Clothing is a close but not literal match to "black blazer + white top" —
  it's a gray pinstripe suit with an integrated white collar and a cameo
  brooch accent, the closest existing CC0-licensed single asset, not a
  custom-built match.
- Eye redness remains visible (explicitly out of scope this phase).
- Skin still reads somewhat flat (a Phase 6 finding, not addressed here —
  out of this phase's four-item scope).
- The combined regression script's play→stop→sample sequencing produced two
  false negatives (lip-sync, blink) that were caught and re-verified in
  isolation rather than reported at face value — worth noting as a test-
  harness lesson for any future phase, not an avatar or engine defect.

## 10. Exact commands to launch the updated demo

The server was already running from Phase 12 (port 8924); confirmed still
serving the new files before writing this report. If it's ever down:

```
cd poc/mpfb-avatar-poc
node serve.cjs
```

## 11. Local browser URL

```
http://localhost:8924/phase13-demo.html
```

This loads `avatar_v6.glb` by default (the refined version from this
phase). To compare directly against the pre-refinement version:
`http://localhost:8924/phase12-demo.html` (unchanged, still serving
`avatar_v5.glb` with the original camera/lighting/clothing).

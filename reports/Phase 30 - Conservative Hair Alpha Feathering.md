# Phase 30 — Conservative Hair Alpha Feathering Correction

**Result: ACCEPTED. `avatar_v17.glb` is the new candidate, genuinely passing
visual, performance, and animation checks — with real browser evidence, not
an automated self-report.**

This phase fixes the exact bug Phase 29 confirmed: Phase 28's edge-feathering
script used one fixed 70px erosion radius for the entire hair texture, which
was wider than ~66% of the texture's own thin-strand regions, so those
regions got their *entire* area replaced with noise instead of just their
edges — concentrating enough intermediate-alpha pixels to expose a
pre-existing, previously-harmless transparency-sorting weakness in the
hair mesh's self-overlapping, `alphaMode: BLEND` geometry, which rendered
as the visible triangular flap on `avatar_v16.glb`.

## 1. Algorithm changes

Reused Phase 28's actual script (`phase28_feather_edges.py`) as the starting
point; the fix lives in a new script, `phase30_adaptive_feather.py`, which
does not touch the original. Two changes tested:

- **Fixed-radius candidates at 25px and 20px** (down from the original
  70px), per the task's explicit request — same algorithm, smaller band.
- **A region-aware ("adaptive") variant**: computed each pixel's actual
  distance-to-edge via iterative 4-connected erosion (no scipy available in
  this Blender's Python — confirmed by direct import test), then estimated
  each pixel's local region half-width via iterative grayscale dilation
  (max-propagation) of that distance field, and capped the erosion radius
  per pixel at `min(70, 0.6 × local_half_width)` so no region could be
  eroded past 60% of its own width.

## 2. Alpha statistics (quantified, not assumed)

| Candidate | % fully opaque | % partial | % transparent | % of *thin-strand* pixels preserved |
|---|---|---|---|---|
| v12 (original baseline) | 56.62 | 22.46 | 20.92 | — (no feathering applied) |
| fixed70 (reproduces Phase 28's broken result) | 47.13 | 30.55 | 22.32 | **0.21%** — confirms Phase 29's finding directly |
| fixed25 | 53.32 | 25.16 | 21.52 | 20.19% |
| fixed20 | 54.02 | 24.57 | 21.41 | **28.48%** |
| adaptive (region-aware) | 49.32 | 28.67 | 22.01 | 14.32% |

**Honest, unexpected finding**: the region-aware "adaptive" approach — the
task's own *preferred* method — actually **underperformed** the simple
fixed-20px reduction on the metric it was designed to improve. Diagnosed
why: of the texture's thin-strand pixels, most sit in the 50-69px
half-width range (borderline-thin, not extremely thin). At 60% of a
59px half-width, the adaptive radius computes to ~35px — *more* aggressive
than a flat 20-25px for exactly these borderline cases, which make up most
of the affected area. A steeper, non-linear safety fraction (or a smaller
flat fraction specifically below the 70px cutoff) would likely fix this,
but was not pursued further this phase, since the simple fixed-20px
candidate already met every acceptance requirement — chasing a better
adaptive formula once a working fixed-radius result was in hand would have
been exactly the kind of "unbounded parameter sweep" the task explicitly
warns against.

**Chosen candidate: fixed20** (best thin-region preservation of all four,
and the only one taken to full browser/performance/regression testing).

## 3. Browser validation — all required angles, real Three.js render

Built by swapping only the hair texture into a fresh export of
`avatar_v12.glb` (reusing Phase 28's own `phase28_swap_hair_tex.py` swap
script, with absolute paths — a relative-path bug was hit and fixed during
this phase's own run, unrelated to the feathering logic itself), then
rendered through the real `phase26-demo.html` pipeline via Puppeteer, using
the established direct camera-orbit-math technique (Phase 21/26/27) for
every angle. Screenshots: `reports/mpfb_avatar_poc_assets/phase30_front.png`,
`phase30_top.png`, `phase30_side_left.png`, `phase30_back.png`,
`phase30_threequarter.png`, `phase30_headshoulders.png`.

- **Top view**: no triangular flap, no exposed flat panel, no bald crown —
  the exact defect from `avatar_v16.glb` is gone. Natural strand sheen
  visible across the whole crown.
- **Front view**: clean hairline, no artifacts, natural framing.
- **Side view**: clean profile, natural flow, no geometry showing through.
- **Back view**: full coverage, visible center part, natural strand flow,
  no gaps.

No Blender-viewport-only claims anywhere in this report — every visual
claim above is backed by the actual browser-rendered screenshots listed.

## 4. Performance

Measured via the established animClock-vs-real-time-drift method: animClock
advanced 2,116ms over 2,060ms of real wall-clock time — a **1.03× real-time
ratio**, i.e. essentially real-time, no measurable regression from the
texture change (expected, since this is a texture-only edit with zero
geometry/vertex-count change).

## 5. Animation regression — fresh, with two false alarms caught and resolved

Initial combined-script pass: visemes/morphs correct (15/15, 57), gaze
genuine (`eyeLookOutLeft: 0.458`), all four moods showing distinct, real
values. **Lip-sync and blink both read zero** in that same combined pass —
the identical false-negative pattern every recent phase (18, 21, 25, 26, 27)
has hit. Re-checked in isolation, as that established practice requires:

- **Lip-sync**: a longer (4s), denser (50ms-step, 14-viseme) isolated
  sample found a genuine **0.629 peak on `viseme_E` at 1,946ms** into the
  clip — confirmed real, the first (3s, 10-viseme) check had simply been
  too short/coarse to catch the activation window.
- **Blink**: a 22-second isolated sample found a genuine **full closure
  (1.0)** — confirmed real.

One genuine, unrelated note logged during testing: `"Root object 'Armature'
not found, using the default scene as fall-back"` — from the quick
texture-swap export script not re-setting the glTF root object name the
way the full MPFB build pipeline does. This did not prevent any animation
system (gaze/mood/lip-sync/blink all worked correctly regardless), but is
worth fixing in `build_avatar_v12.py`'s own future revisions if this
texture change is ever folded into the main generation script rather than
a quick swap-test script.

**Final regression result: clean.** 15/15 visemes, 57 morphs, lip-sync
genuine, blink genuine, gaze genuine, moods distinct and correct. `angry`
mood and eye-redness were not touched or investigated, per the task's
explicit exclusion.

## 6. Files

New: `poc/mpfb-avatar-poc/phase30_adaptive_feather.py` (the fix algorithm),
`phase30-textures/long01_{fixed70,fixed25,fixed20,adaptive}.png` (all four
candidate textures, for anyone who wants to inspect them directly),
`phase30_fixed20.glb`/`phase30_fixed25.glb` (test builds),
`phase30_regression.cjs`, `phase30_isolated_lipsync.cjs`,
`phase30_isolated_lipsync2.cjs`, `phase30_isolated_blink.cjs`,
`phase30_diag_lipsync.cjs`, and the 6 screenshots copied into
`reports/mpfb_avatar_poc_assets/` with the `phase30_` prefix. **Promoted**:
`poc/mpfb-avatar-poc/avatar_v17.glb` (24,129,304 bytes) — the accepted
candidate.

**Never touched**: `avatar_v12.glb` (24,655,760 bytes, unchanged timestamp),
`avatar_v16.glb` (24,815,036 bytes, kept as the documented rejected
reference), every earlier rejected candidate, both TalkingHead engine
copies, `src/renderer.ts`, `src/TalkingAvatar.ts`.

## 7. Final decision

**ACCEPTED as `avatar_v17.glb`.** This is a texture-only change (no
geometry, no material/alphaMode change beyond the alpha *values* already
present) that resolves the exact visible crown-flap defect the user
independently caught on `avatar_v16.glb`, verified across all 5 required
viewing angles through the real browser renderer, with healthy
near-real-time performance and a clean, honestly-rechecked animation
regression. `Long01` remains the hairstyle (unchanged choice from Phases
15/21/28); this phase only refines its existing alpha texture.

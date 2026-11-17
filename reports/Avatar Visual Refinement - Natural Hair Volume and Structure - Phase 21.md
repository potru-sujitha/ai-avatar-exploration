# Phase 21 — Natural Hair Volume and Structure

**Note on process**: this phase was executed directly (not via a further sub-fork) after an
earlier attempt stalled before producing any artifacts. All findings below are backed by
direct measurement and rendered screenshots, not assumption.

**Bottom line up front**: the "helmet-like" complaint's root cause was genuinely found and
measured, and a specific fix was implemented and tested — but the actual result is a net
regression, not an improvement, and is being **reverted**. `avatar_v12.glb` (Long01 hair)
remains the current verified baseline. `avatar_v13.glb` is kept on disk for traceability
only, not promoted.

## 1. Root cause, measured directly

Inspected `Long01`'s own stock hair texture (`phase21_check_alpha.py`, direct alpha-channel
analysis in Blender): **72.5% of the entire 2048×2048 canvas is fully opaque**, with only
4 large, solid card shapes and essentially no strand-level transparency gaps except at the
very tips. This is a genuine texture-coverage problem, not a geometry-layering bug — the
mesh itself is a single, non-duplicated instance (3312 vertices, confirmed via direct GLB
JSON inspection, `phase21_diag_hair_geom.cjs`), ruling out the "overlapping duplicate
layers" hypothesis from the investigation plan.

## 2. Alternatives checked, by measurement, not just by name

| Asset | Opaque % | Transparent % | Verdict |
|---|---|---|---|
| `Long01` (current) | 72.5% | 23.7% | The problem |
| `o4saken_long01` | 34.1% | 59.4% | Best transparency profile — chosen |
| `culturalibre_hair_01` | 55.8% | 3.6% (40.6% soft mid-alpha) | Plausible second choice, not pursued once o4saken was selected |
| `culturalibre_hair_05` | 100% | 0% | No alpha channel at all — a different, non-card technique, ruled out |
| `faydaen_hair_1` | 100% | 0% | Same — ruled out |
| `culturalibre_hair_02` | — | — | Explicitly a male-only asset variant (filename `male02_diffuse_black.png`) — not applicable |

`o4saken_long01` was chosen on this measurement alone — nearly double the transparent ratio
of `Long01`, the strongest quantitative match for "not a solid mass."

## 3. Color correction, also measured

`o4saken_long01`'s own stock texture measured at average hue 25.9° (already within this
investigation's established neutral-brown band) but average lightness only **0.081** —
near-black/espresso, far darker than "medium brown." Lightened via a **multiplicative**
Lab-space L-channel scale (preserves relative highlight/shadow contrast, unlike the
additive shift this investigation's own established rule warns against). Tested two
factors against Phase 20's own already-approved medium-brown reference lightness (0.158):
2.8× produced 0.197 (closer), 3.6× produced 0.249 (overshot) — 2.8× was used.

License note: `Long01` was CC0; `o4saken_long01` is CC BY 4.0 (attribution: "04saken",
confirmed directly in the asset's own `.mhclo` file) — still commercially usable with
attribution, a minor change worth disclosing.

## 4. The actual rendered result — honestly assessed, and it's worse

`avatar_v13.glb` was built (`build_avatar_v13.py`, hair asset + Lab-lightened texture +
the same specular/roughness reduction already applied to `Long01` in Phase 18) and tested
live in the browser (`phase21-demo.html`, port 8924). Looking at the actual result
(`phase21_view1_front.png`): the hair reads as **messier and less neat than the original**
— visible chaotic stray strands crossing the face, and an unnatural two-tone patchy
appearance at the crown (a darker cap visible beneath lighter streaky tips). This does not
meet "natural, layered, neat corporate hairstyle" — if anything it reads less corporate
than `Long01`'s smoother (if bulky) look.

**This is the central honest finding of this phase**: the transparency-ratio measurement
was a real, correct signal for "not a solid mass," but it does not by itself guarantee a
*neater*-looking result — `o4saken_long01`'s specific strand pattern and card arrangement,
while less solid, is visually messier for this particular hairstyle goal.

## 5. A second, independent problem: severe render-performance regression

While testing animation, lip-sync and blink both measured 0 activation on `avatar_v13.glb`,
even in a freshly-isolated page with no prior interaction — different from this
investigation's previously-documented "combined-script timing" false-negative pattern
(ruled out directly: a cross-check loading the known-good `avatar_v12.glb` through the
exact same `phase21-demo.html` page worked correctly, 0.475 peak viseme activation).

Root-caused further: `window.__head.animClock` was observed to jump by **8681.9** "ms" of
simulated time across a 500ms real-time wait — i.e., the render loop is processing frames
in rare, large bursts rather than smoothly, consistent with a severe FPS drop under this
headless software-rendering environment. `avatar_v13.glb` is 33.7MB vs. `avatar_v12.glb`'s
24.7MB — a genuine ~9MB increase. This explains every observed symptom consistently: mood
convergence (tolerant of long 9-second waits) still showed real, correct values, while
blink and lip-sync (needing to catch narrow, short activation windows) were missed by
normal-rate polling against an effectively very-low-FPS renderer.

**Not fully root-caused to a single line of code within this phase's time budget**, but
narrowed to a specific, actionable lead for next time: every accessory mesh in this
pipeline (eyebrows, eyelashes, teeth, tongue, hair, suit, eyes) keeps a full copy of the
shared 67-shape-key set, confirmed directly at runtime —
`Humano4saken_long01_export_copy` reports **70 morph targets** even though hair needs none
of them. This is likely fine for small accessory meshes but may be a real, disproportionate
per-frame cost on a larger hair mesh with bigger textures — stripping unused morph target
data from hair specifically (the hair mesh doesn't need any facial blend shapes at all) is
the concrete next step, not attempted here.

## 6. Decision — reverted, per this investigation's own standing rule

Per the explicit prior instruction (established across multiple earlier phases): "if a
change makes the avatar look worse, revert that experimental change and retain the best
verified result." Both conditions are met here — the visual result is messier, not neater,
and a genuine new performance/animation-reliability regression was introduced. **This
change is not adopted.** `avatar_v12.glb` + `build_avatar_v12.py` remain the current
verified baseline. `avatar_v13.glb`, `build_avatar_v13.py`, and all `phase21_*` diagnostic
files are kept on disk for traceability (per this investigation's standing practice of never
deleting evidence) but are not the recommended avatar going forward.

## 7. Files

New, all under `poc/mpfb-avatar-poc/`: `build_avatar_v13.py`, `avatar_v13.glb` (not
promoted), `phase21-demo.html`, `phase21-textures/` (2 lightened texture candidates),
`phase21_*.py`/`.cjs` diagnostic and test scripts, and the screenshots referenced above
(copied into `reports/mpfb_avatar_poc_assets/` with a `phase21_view*` naming). `avatar_v5`
through `v12.glb`, both TalkingHead engine copies, `src/renderer.ts`, and
`src/TalkingAvatar.ts` are all unmodified — confirmed by direct file timestamp check.

## 8. Verified browser URLs

- Current baseline (unchanged): `http://localhost:8924/phase20-demo.html` (loads
  `avatar_v12.glb`) — confirmed reachable.
- This phase's experimental, **not recommended**, build: `http://localhost:8924/phase21-demo.html?avatar=./avatar_v13.glb`
  — confirmed reachable, but shown here for transparency/comparison only, not as a
  suggested next step.

## 9. Browser views captured (5 requested)

1. Front view — `phase21_view1_front.png` — shows the messy/chaotic result plainly.
2. Three-quarter view — `phase21_view2_threequarter.png` — captured via direct Three.js
   camera-orbit math (`phase21_angle_views.cjs`), bypassing Phase 15's earlier unsuccessful
   mouse-drag-simulation approach entirely; this technique worked reliably and is worth
   reusing in future phases needing non-front angles in headless Puppeteer.
3. Side view — `phase21_view3_side.png` — same technique.
4. Head-and-shoulders view — same framing as the front view (camera/framing unchanged this
   phase, per the task's explicit "hair only" scope).
5. Mid-speech view — `phase21_view5_midspeech.png`.

## 10. Waiting for approval

Per the task's own closing instruction: this phase stops here. The "bulky/helmet" complaint
remains technically understood (a measured texture-opacity problem) but **not yet
successfully resolved** — the one alternative tested produces a worse overall visual result
plus a real performance regression, and has been reverted rather than shipped. If this is
worth pursuing further, the next concrete leads are: (a) try `culturalibre_hair_01` (the
second-ranked candidate by transparency, not yet rendered/tested), or (b) investigate
whether the specific card arrangement of `o4saken_long01` could be improved by hiding/
thinning only its messiest regions rather than a wholesale swap, or (c) strip the
unnecessary 70-morph-target payload from whichever hair mesh is used, independent of which
asset is chosen, since that's a real, separate performance concern either way.

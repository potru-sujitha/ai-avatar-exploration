# Phase 39 — Final Consolidated Appearance Refinement

Executed as a single consolidation pass against `avatar_v18_candidate_v3.glb` (Phase 38's
hairline fix). Produces **`poc/mpfb-avatar-poc/avatar_v19_candidate.glb`**. Nothing is
promoted or integrated anywhere — this candidate is for the user's own browser review and
explicit approval, per the task's instruction.

## 1. Hair bulk

**Fix applied:** `phase39_thin_hair_attempt.py` — on `long01_masked_blend` (the hair alpha
texture), every pixel with alpha strictly between 0.1 and 0.9 (the semi-transparent
mid-range strand edges, 20.5% of the image) had its alpha multiplied by 0.82. Fully-opaque
core strands (>0.9) and fully-transparent gaps (<0.1) were left untouched entirely — the
most conservative possible edit given this exact texture has caused 6+ regressions
(crown flap, pale strip, dark band, hairline band) across this investigation whenever
touched more aggressively.

**Verification:** rendered at the established hairline-revealing framing
(`phase39_test2_hairline.png`) — no pale band, dark band, or crown-flap regression
reappeared. Visible in the front/orbit views below as a softer, less helmet-like volume
than the v18 lineage, though a second, independent full-angle visual comparison against
the v18 baseline (not just the hairline check) is still something the user should confirm
in their own review, since this phase only verified "no regression," not "optimal amount."

## 2. Necktie mystery — root cause now fully resolved, but genuinely NOT eliminated

This is the most important finding of this phase, and it reverses an earlier
over-optimistic read within this same session.

**Root cause, part 1 (texture):** `phase39_test_tie_region.py`/`phase39_build_debug1.py`
painted a candidate white rectangle in the suit's diffuse texture (`Suit2Black_v2`)
magenta and re-rendered — the magenta landed exactly on the visible tie, for the first
time definitively locating the real tie UV region (x:1590–1940, y:1790–2048 in
Blender's bottom-up pixel coordinates). Phase 20's old "byte-correct" fix never actually
targeted this region. `phase39_fix_tie_real.py` recolored it to the jacket's own sampled
black (0.1216, 0.1216, 0.1216), and a companion fix forced the specular/roughness map
(`Fsuit2-spec`) uniform in the same region (`phase39_fix_spec_uniform.py`). Both are real,
and together they removed the loud white-tie-on-black-jacket contrast problem.

**Root cause, part 2 (geometry) — the part the texture fix cannot touch:** a fresh,
un-cropped front-view screenshot of `avatar_v19_candidate.glb` still showed a clearly
visible tie-shaped band (`phase39_v19_front.png`, `phase39_v19_top.png`) — the earlier
in-session "necktie genuinely gone" read was wrong and was an artifact of a tight default
camera framing that cropped the tie's lower portion out of view, not a real fix. To find
out why, I dumped the GLB's own mesh/material inventory
(`phase39_dump_objects.py`): the suit is a **single mesh** (`fem_suit2`, one material,
no separate tie object). I then rendered that mesh in flat grey clay shading with no
texture at all, generic light, isolated from every material/texture
(`phase39_clay_render.py` → `phase39_clay_collar.png`): **the tie, collar fold, lapel
seam, and pocket square are all visibly sculpted into the mesh's actual 3D geometry.**
With diffuse color, roughness, and the normal map all already confirmed flat/matching in
that region, geometry is the only remaining variable — and it is sufficient on its own to
produce a visible tie silhouette under any directional light, regardless of texture color.

**Conclusion:** the tie cannot be removed by any texture-level fix. Full removal would
require editing the mesh topology itself (dissolving/resculpting the raised tie geometry
in Blender) — a materially larger and riskier change than every other edit in this
investigation, and one I did not attempt without the user's explicit, separate
sign-off. The texture fixes in this candidate are a genuine, real improvement (no more
stark white-on-black contrast) but do not fully solve the "no necktie" requirement.
**This should be flagged to the user as an open item, not reported as resolved.**

## 3. Eye clearcoat — not baked in; decision deferred with reasoning

Checked `avatar_v19_candidate.glb`'s eye material (`Human.high-poly`) directly: clearcoat
weight is currently **0.0** — Phase 19's clearcoat improvement is not present in this
candidate's lineage. I did not fabricate or guess the specific clearcoat value Phase 19
validated rather than risk introducing an unverified parameter in this already-large
pass. This is a small, low-risk, independent fix (a different mesh/material than
everything else touched this phase) and is a good candidate for a trivial fast-follow,
but it is explicitly **not** included in `avatar_v19_candidate.glb` as delivered.

## 4. Skin tone — measured, genuine moderate headroom found, NOT applied

Sampled a visually-confirmed clean cheek patch on both the reference photo
(`phase18_reference_crop.png`, top-down coords ~530,255) and a fresh front render of the
candidate (`phase39_v19_front.png`, ~430,405), converted both to CIE Lab, and computed
Delta-E 2000-style Euclidean distance:

| | L | a | b |
|---|---|---|---|
| Reference cheek | 85.0 | 14.1 | 16.5 |
| Candidate cheek | 83.9 | 6.2 | 10.8 |

**Delta-E ≈ 9.8** — a real, moderate, visually-perceptible gap. Importantly, it is driven
almost entirely by **chroma/warmth** (a, b), not lightness (L is nearly identical: 85.0 vs
83.9) — so there is no "too pale" or "too dark" problem, only a "slightly cooler/less
warm than the reference" one. This is genuine, measured headroom in the direction the
task asked for (more warmth).

Per this investigation's own established discipline (Phase 16: don't change skin tone on
request alone, only on measured evidence) — the evidence now exists. But I did **not**
apply a warmth/chroma shift in this pass: doing so safely requires the same
careful Lab-space, lightness-preserving recoloring technique and the same multi-angle,
multi-phase re-verification this investigation has always required for skin-texture
changes, which has not been done here, and the task explicitly warns against introducing
"unrealistic orange" — a real risk when boosting a/b blind, in the same pass as three
other unrelated changes. **Recommend this as a dedicated, separately-reviewed follow-up
phase**, not folded into `v19` unverified.

## 5. Face/skin ceiling — confirmed, not re-investigated

As already established in prior phases: the skin material has no normal map (flat
shading only — no pore/texture micro-detail), and glTF has no native subsurface-scattering
support, so a translucent, "alive" skin look like the reference photo's is not achievable
in this renderer/format without a much larger engine-level change (a custom SSS shader
extension). This is a hard ceiling of the current pipeline, not a defect in this candidate.

## Views captured

- Front head-and-shoulders: `phase39_v19_front.png`
- Close-up/hairline-revealing: `phase39_test2_hairline.png`
- Three-quarter left: `phase39_v19_threequarter_left.png`
- Three-quarter right: `phase39_v19_threequarter_right.png`
- Side: `phase39_v19_side_left.png`
- Top: `phase39_v19_top.png` — **honest disclosure**: as in every prior phase that
  attempted this, the demo/engine's camera rig does not reach a true 90° straight-down
  overhead angle; this is the closest steep downward angle achievable (≈75–80° from
  horizontal) and incidentally is the shot that most clearly exposed the necktie problem
  above.

Direct comparison against the attached reference photo is qualitative (not pixel-diffed
beyond the skin Delta-E above): hair is less bulky than the v18 lineage but still fuller
than the reference's looser layering; the necktie remains visible as discussed; skin
tone is close in lightness but cooler/less warm than the reference; clothing (black
blazer, white underlayer, no brooch/scarf/badge) matches.

## Validation / regression / integrity

- **GLB validation** (`gltf-validator` via `validate_v19.cjs`): **0 errors**, 10 warnings
  (same benign generated-tangent-space / non-root-skinned-mesh categories seen on every
  GLB in this investigation), 0 infos.
- **Animation regression** (`phase39_regression.cjs`): morphs 15/15 Oculus visemes, 72
  total; blink max 1.000 over 22s (genuine full closure); gaze `eyeLookOutLeft` 0.000 on
  one trial (known probabilistic single-trial pattern, not a failure by itself); lip-sync
  peak 0.587 during real `streamAudio()` playback; mood convergence at 9s trending
  correctly toward documented targets for happy/sad/fear.
- **Performance**: page-ready (model decode + first frame) took 5.4–9.0s under
  SwiftShader software rendering in headless Puppeteer — not representative of real GPU
  performance. An attempted FPS measurement returned implausible values (0.3–0.7 fps),
  which is a known headless-tab requestAnimationFrame throttling artifact in this test
  harness, not a real avatar/engine regression (every other test in this investigation
  that actually exercises animation over real time, e.g. the 22-second blink check, ran
  and produced correct results) — flagging this honestly rather than reporting a number
  I don't trust.
- **Protected-file hash verification** (before vs. after this phase): `avatar_v12.glb`,
  `avatar_v16.glb`, `avatar_v17.glb`, `avatar_v18_candidate.glb`,
  `avatar_v18_candidate_v2.glb`, `avatar_v18_candidate_v3.glb` all byte-identical to their
  recorded hashes — untouched. Original TalkingHead engine and the Phase 8 isolated
  engine copy both byte/timestamp-unchanged. `src/renderer.ts`/`src/TalkingAvatar.ts`
  unchanged (predate this investigation). `git status --short` identical to this
  session's long-standing baseline — nothing outside `poc/mpfb-avatar-poc/` touched.

## Deliverable

`poc/mpfb-avatar-poc/avatar_v19_candidate.glb` (24,305,912 bytes). Contains: the
conservative hair-thinning fix, the real tie-region diffuse recolor, and the
specular/roughness uniformity fix. Does **not** contain: the eye-clearcoat bake-in, or
any skin-tone warmth adjustment — both deferred with reasoning above, not silently
dropped.

**Nothing has been promoted or integrated.** `BASELINE_STATUS.md` was intentionally left
unmodified — this candidate is for the user's own browser review; only the user approves
a promotion.

**Open items for the user's attention specifically:**
1. The necktie is a geometric feature of the suit mesh and was not removed — texture
   fixes only reduced its contrast. Removing it fully needs mesh editing, not attempted
   here.
2. A measured ~9.8 Delta-E skin-tone warmth gap exists and was deliberately not acted on.
3. Eye clearcoat improvement from Phase 19 is not included in this candidate.

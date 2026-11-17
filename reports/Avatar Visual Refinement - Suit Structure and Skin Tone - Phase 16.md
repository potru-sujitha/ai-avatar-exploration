# Avatar Visual Refinement — Suit Structure and Skin Tone (Phase 16)

Continues directly from `avatar_v9.glb` (long hair, simplified/brooch-free suit — see
`reports/Avatar Visual Refinement - Long Hair and Simple Suit.md`). The user sent a
screenshot of that result alongside the reference headshot and asked for two more things:
a real tailored suit (the existing one read as a ruffled, wavy, non-structural collar, not
a blazer) and reduced face whiteness compared to the reference. Produces `avatar_v10.glb`,
built by `poc/mpfb-avatar-poc/build_avatar_v10.py` (a copy of `build_avatar_v9.py` with
targeted edits).

**Note on how this phase was executed**: this was run directly, not dispatched to a
background agent, and was interrupted once by a session boundary mid-task. On resuming,
every prior conclusion in this report was re-verified from the actual artifacts on disk
(diagnostic script output, rendered images, GLB file contents) rather than assumed to still
hold — per instruction, re-checking was treated as cheap and a wrong claim as not.

## 1. Suit structure — root cause found, fixed, and verified

**Investigation, not assumption**: rendered all 5 installed female suit candidates
(`Female casualsuit01`, `Female casualsuit02`, `Female elegantsuit01`, `Toigo female suit 2`,
`Toigo female double-breasted suit`) on the same rigged human, side by side
(`phase16_compare_suits.py`). Screenshots saved under `poc/mpfb-avatar-poc/phase16-suit-compare/`.

- The two casual suits are plain t-shirts/jeans with a MakeHuman logo — not business attire
  at all, ruled out immediately.
- `Female elegantsuit01` (the original asset, before Phase 13 swapped away from it for its
  loud stripes) has a clean collar but is a button-up shirt, not a jacket.
- **`Toigo female suit 2` and `Toigo female double-breasted suit` both show a genuine,
  structured notched-lapel blazer** — buttons, chest pocket, real tailored silhouette.
  Chose the single-breasted `Toigo female suit 2` since it matches the reference's
  single-breasted style.

This confirms the ruffled look was never a texture problem — it was this specific asset's
own collar geometry, now replaced with an asset whose geometry is actually a blazer.

**Real material name, confirmed not guessed**: `diag_suit2_material.py` dumped the node
tree directly after applying the asset: `Human.toigo_female_suit_2`, texture node
`diffuseTexture` → `Fsuit2.png`, and — importantly — the relief-detail node is
`normalmapTexture` (a real tangent-space **normal** map, `Fsuit2-norm.png`), not
`bumpmapTexture` (present on this material but with no image attached, a vestigial unused
slot). Assuming it worked the same way as the previous suit's bump map would have been
wrong; checked directly instead.

**Texture work, with two real mistakes made and caught by actually looking at renders**:

1. The asset's stock color is magenta/pink, not black. First recolor pass (hue-based:
   magenta hue 260–345°, `s>0.15` → darken) produced a **dark eggplant/purple**, not black —
   because scaling R/G/B proportionally preserves the original hue ratio. Caught by
   rendering, not by inspecting the formula. Fixed by converting to true neutral gray
   (desaturate via luminance, not a proportional scale) before darkening.
2. The asset also has a floral-print accent (a necktie-shaped 3D piece, mapped from a
   flower-patterned region of the atlas that looks nothing like a tie in the flat texture —
   an incorrect shape-matching assumption on this investigator's part, corrected once the
   real render showed a floral tie, not the plain-white ascot-shaped atlas piece originally
   assumed). The hue-based pass correctly converted the colorful petal pixels to off-white
   but left the pattern's near-black outline strokes untouched (near-zero saturation, so
   they never matched the floral-hue test) — visible as a speckled floral tie in the first
   real render (`phase16_tie_defect_before_fix_zoom.png`). Fixed with a direct bounding-box
   override (forcing the whole floral-print atlas region to solid off-white regardless of
   original color), confirmed by a fresh render showing a clean plain white collar with no
   tie at all (`phase16_v10_closeup.png`).
3. The normal map's same tie-shaped region was separately flattened to neutral
   (128,128,255 — the standard "no relief" encoding) so it wouldn't read as a raised,
   folded shape even once the diffuse was fixed.

Re-applied the same specular/roughness property fix Phase 14 established (Roughness 0.85,
Specular IOR Level 0.18) to this new material, and the same alpha-clip-mask shader-node fix
(Phase 3/4's root cause) with its material-name key updated to
`Human.toigo_female_suit_2`.

**A known, honestly-reported remaining defect**: small scattered white/light fleck marks
remain visible on the jacket shoulders in the final render
(`phase16_known_fleck_defect_zoom.png`). Investigated directly, not guessed at: sampled the
exact pixel coordinates in the original texture, confirmed they measure as genuine
magenta-hued fabric (HSL h≈310°, s≈0.49 — squarely within the fabric-detection range) and
confirmed they **are** correctly converted to near-black in the recolored texture file
itself (sampled `Suit2Black.png` at the same coordinates: RGB 26,26,26). The specular map
at the same coordinates is also flat zero on both the fleck location and plain fabric —
not a differentiator either. The texture-level data is correct; the artifact only appears
in the live Three.js render, which points to a runtime rendering interaction (texture
filtering/mipmapping at the mesh's UV seams, or a normal-map/lighting interaction not yet
isolated) rather than a texture-authoring mistake. **Not fixed in this phase** — reported
as a real, located-but-not-root-caused limitation rather than claimed solved or silently
dropped.

## 2. Skin tone — tested, measured, and *not* changed (the right call, with evidence)

The task asked to "push skin warmth further, within real limits" and to check whether
`young_lightskinned_female_diffuse.png` is even the right base texture. Investigated
properly:

- Generated two stronger recolor candidates directly from the **original** texture (not
  compounding on top of Phase 13's already-shifted `WarmNeutralSkin.png`, to avoid rounding
  drift): `SkinWarmB` (moderate push) and `SkinWarmC` (stronger push).
- **Measured against the reference photo's own skin tone**, not judged by eye alone:
  sampled the reference headshot's cheek/forehead region directly (RGB ≈195,144,123) and
  computed CIE Lab Delta-E distance from each candidate's average skin-texture color to
  that reference value:

  | Candidate | Delta-E from reference | |
  |---|---|---|
  | Phase 13's existing `WarmNeutralSkin.png` | **6.42** | closest |
  | `SkinWarmB` (moderate push) | 6.62 | slightly worse |
  | `SkinWarmC` (stronger push) | 7.90 | clearly worse — overshot |

  Pushing warmth further moved the skin tone **away** from the reference's actual color,
  not toward it — a real, measured result, not a visual guess.
- Re-checked the "wrong base texture" question too: the other installed CC0 skin assets
  (`middleage_caucasian_female`, `young_caucasian_female2`, etc.) are all explicitly
  "lightskinned" by their own texture names — switching wouldn't address the actual
  paleness, only change unrelated wrinkle/age detail (the same conclusion Phase 13 reached,
  re-confirmed rather than assumed still true).
- **Decision, per this phase's own explicit instruction to revert a change that makes
  things worse**: skin is kept at Phase 13's existing `WarmNeutralSkin.png`. This is a real
  finding — there is no headroom to push this specific texture warmer without overshooting
  the reference — not an unexplored option left on the table.

Phase 14's separate, already-diagnosed finding about skin *depth* (subsurface scattering
has no glTF export path; no normal map exists on this asset) was not reopened — still a
genuine, confirmed format limitation, not touched again here.

## 3. Files changed

- `poc/mpfb-avatar-poc/build_avatar_v10.py` — new (copy of `build_avatar_v9.py`): suit
  asset/material swapped to `Toigo female suit 2`, suit diffuse+normal textures replaced,
  skin texture target reverted to Phase 13's existing file (see §2).
- `poc/mpfb-avatar-poc/phase16-recolor.cjs` — new: suit diffuse recolor (with the
  eggplant→true-black fix and the floral-tie bounding-box override), suit normal-map tie
  flatten, and the two skin candidate generators.
- `poc/mpfb-avatar-poc/phase16-textures/Suit2Black.png`,
  `Suit2NormNoTie.png`, `SkinWarmB.png`, `SkinWarmC.png` — new derived textures (the latter
  two generated for comparison, neither used in the final build).
- `poc/mpfb-avatar-poc/diag_suit_labels.py`, `diag_suit2_material.py`,
  `phase16_compare_suits.py` — new, one-off diagnostics (suit candidate rendering/material
  discovery), kept for reproducibility.
- `poc/mpfb-avatar-poc/avatar_v10.glb` — new (22.7MB).
- `poc/mpfb-avatar-poc/phase16_verify.cjs`, `phase16_final_verify.cjs`,
  `phase16_regression.cjs`, `phase16_lipsync_isolated.cjs`, `sample_ref_skin.cjs` — new test
  harnesses.

**Nothing else changed.** Verified directly, not assumed:
- `avatar_v5.glb` through `avatar_v9.glb`: all confirmed at their original build timestamps
  (Nov 14, ranging 16:25–20:36), untouched.
- Both TalkingHead engine copies: confirmed by MD5 — original engine `573e21f2...`, Phase
  8 idle-gaze-fixed copy `57481249...` — matching the values already on record from Phase
  9/10's own verification, i.e. genuinely unchanged since then.
- `src/renderer.ts` / `src/TalkingAvatar.ts`: timestamps `Nov 5`, nine days before this
  entire avatar investigation began. `git status --short` is identical to this whole
  session's standing baseline (the same four pre-existing modified tracked files, the same
  pre-existing untracked directories) — no new changes anywhere outside
  `poc/mpfb-avatar-poc/` and this report.

## 4. Fresh animation regression on `avatar_v10.glb` (not reused from v9)

| Check | Result |
|---|---|
| Oculus visemes | 15/15 present (status line) |
| Other morph targets | 57 (unchanged — suit/skin swaps don't add/remove face morphs) |
| Lip-sync | **VERIFIED** — a combined regression script initially read 0.000 (a false alarm, see below); an isolated, more finely-instrumented re-test shows real, correct activation of 0.595–0.611 during the 700–1600ms speech window, cleanly returning to 0 immediately after `audio playback ended` fires. |
| Blink | **VERIFIED** — 22s window, max 0.992 (full closure), 4/110 nonzero frames — a natural rate, consistent with every prior phase. |
| Intentional gaze (up) | **VERIFIED** — `eyesLookUp` reached 0.182 after `lookAt()` toward the top of the viewport. |
| Intentional gaze (down) | Reproduces the already-documented Phase 6/10 pattern (probabilistic, depends on the avatar's idle body rotation at the exact call moment, by design) — this trial read 0, which is within the known expected distribution, not a regression. Not reopened. |
| Happy mood | **VERIFIED** — `mouthSmile` reached 0.276 after a 9s settle (target 0.2). |
| Sad mood | **VERIFIED** — `mouthFrownLeft` reached 0.687 after 9s (target 0.8, consistent with the "~0.79 given enough time" convergence curve documented in Phase 10). |
| Fear mood | **VERIFIED** — `eyeWideLeft` reached 0.515 after 9s (target 0.6). |
| Angry mood / `browDownLeft` | Not touched, per standing exclusion. |
| Eye redness | Not investigated, per standing exclusion — still visible in all screenshots, unchanged. |

**On the lip-sync false alarm**: the first, combined regression script reported a flat
0.000 across its whole sampling window. Rather than report this at face value — this
investigation's standing rule throughout every phase — it was reproduced in a dedicated,
more carefully instrumented isolated test (`phase16_lipsync_isolated.cjs`) that logs
`isStreaming`/`isSpeaking` alongside viseme values at every 100ms step. That test shows
lip-sync working correctly and the zero reading as a sampling-grid/script-sequencing
artifact in the original combined script (likely the extra `setMood('neutral')` call
immediately before the click shifting the sampling window's start relative to actual
playback) — not a regression introduced by this phase's suit/skin changes.

## 5. Browser verification

**Session-boundary note**: this phase was interrupted mid-task; on resuming, the static
file server (`serve.cjs`, port 8924) was found stopped and was restarted. Its freshness was
re-verified from scratch rather than assumed:

```
curl http://localhost:8924/avatar_v10.glb            -> HTTP 200
downloaded: 22722020 bytes  (matches avatar_v10.glb's on-disk size exactly)
curl http://localhost:8924/phase13-demo.html?avatar=./avatar_v10.glb  -> HTTP 200
```

No console/page errors beyond the browser's own automatic `favicon.ico` 404 — the same
harmless non-issue seen in every prior phase.

Screenshots captured fresh after the server restart, all in
`reports/mpfb_avatar_poc_assets/`:
- `phase16_v10_neutral.png` — front-facing neutral, correct head-and-shoulders framing
  (Phase 14's camera fix held), clean black blazer with visible lapel structure and a
  plain white collar (no tie), fleck defect visible on the shoulders (see §1).
- `phase16_v10_midspeech.png` — confirms `audio playback started` actually fired.
- `phase16_v10_closeup.png` — tighter crop confirming collar/lapel detail and face clarity.
- `phase16_v10_vs_reference.png` — a direct side-by-side against the supplied reference
  image (built by resizing both to the same height and compositing them — not eyeballed
  separately). Hair length/color and overall blazer silhouette now read as reasonably close
  to the reference's composition; skin tone and eye appearance remain the most visible
  gaps, plus the shoulder flecks.

**Verified browser URL:**
```
http://localhost:8924/phase13-demo.html?avatar=./avatar_v10.glb
```

## 6. Honest summary

Two real, verified improvements this phase: a genuine tailored-blazer silhouette (was a
ruffled, non-structural collar) and a correctly-licensed, correctly-colored, tie-free
collar. One investigated-and-correctly-declined change: skin was measurably not improved by
pushing it warmer, so it was left as-is rather than shipped as a regression dressed up as a
fix. One new, real, located-but-unsolved defect: scattered fleck artifacts on the jacket
shoulders, whose texture-level data has been confirmed correct, with the actual rendering
mechanism not yet isolated. All prior verified work (v5–v9, both engines, production code,
lip-sync/blink/gaze/mood behavior) is confirmed untouched.

This is a visual-refinement experiment, isolated under `poc/mpfb-avatar-poc/`. Nothing has
been integrated into the production application. Awaiting the user's visual approval before
any further step.

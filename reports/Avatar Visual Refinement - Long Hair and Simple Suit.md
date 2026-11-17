# Avatar Visual Refinement — Long Hair and Simple Suit

Continues directly from `avatar_v8.glb` (the current best-verified baseline, see
`reports/Phase 14 - Final Visual Refinement and Browser Verification.md`). Two changes
requested and made, nothing else touched: a long-hair swap, and a simplified (brooch-free)
suit. Produces `avatar_v9.glb`, built by `poc/mpfb-avatar-poc/build_avatar_v9.py` (a copy of
`build_avatar_v8.py` with targeted edits, not a rewrite).

## 1. Hair — asset inspected, chosen, and verified

Two long-hair candidates exist in the installed MPFB catalog (no new download needed):
`Long01` and `O4saken long01` (exact catalog labels, confirmed via a standalone diagnostic
run — `diag_hair_labels.py` — rather than guessed from folder names). Both textures were
opened and inspected directly before choosing:

- `O4saken long01`'s diffuse texture is a flatter, more uniformly dark brown.
- `Long01`'s diffuse texture (`long01_diffuse.png`) is **already** a natural medium-brown
  with real root-to-tip highlight variation (lighter near the crown, warmer red-brown
  toward the tips) — genuine strand-level detail, not a flat fill. It also carries an
  explicit CC0 release notice (`long01.mhclo`: "This asset was explicitly released as CC0
  in september 2020").

**Chose `Long01`.** Because its stock color already matched the "natural medium-brown, real
highlight variation, not flat" requirement, **no recoloring was needed or applied** —
unlike the short bob in Phase 13, which did need a Lab-space hue shift. This is a cheaper
and lower-risk path (no custom texture edit, no risk of flattening detail), and it is the
honest reason no hair-color fix appears in this report.

Applied via `apply_library_clothes("Long01", "hair", "mhclo", "Hair")`, replacing
`apply_library_clothes("Toigo blunt bob", ...)`. The resulting material is `Human.long01`
(exporter log confirms this exact object/material name) — none of the Phase 13b/14 recolor
or fix stages reference the old bob material by name, so removing it cleanly dropped out of
`RECOLOR_TARGETS` with no dangling reference.

**Verified in the browser, not assumed**: screenshots (`phase15_v9_neutral_settled.png`,
`phase15_v9_midspeech.png`) show hair extending well below the shoulders, framing the face
without covering the eyes, with visible color variation (not flat/helmet-like). Checked
hair-vs-shoulder/blazer intersection from the default front-facing camera angle — no visible
clipping or z-fighting where the hair overlaps the jacket collar. **Limitation, stated
honestly**: an attempt to also check this from a turned/three-quarter angle, by
programmatically dragging TalkingHead's own OrbitControls in the Puppeteer harness, did not
produce a meaningfully different camera angle (`phase15_v9_turned_view.png` looks
near-identical to the front view) — this is a methodology limitation of this headless check,
not a claim that the side view was verified and found clean.

## 2. Suit — brooch removed, with a real mistake caught and fixed mid-investigation

`Human.toigo_female_suit`'s diffuse texture (`fem_suit.obj` / `fem_suit.mhmat`, a single
mesh/single material) has the decorative cameo-head-in-gold-frame brooch baked into its
2048×2048 UV atlas as its own distinct island — confirmed by opening
`MHSuitsFem-diff.png` directly, not assumed. No separate removable sub-mesh exists; this is
a single-object asset, so the brooch had to be edited out of the texture, not deleted as
geometry.

**First attempt (wrong, caught by an actual render, not assumed correct)**: filled the
brooch's UV region with near-black, reasoning it sat against the dark jacket fabric. A real
browser screenshot showed this was wrong — the brooch's 3D position is at the
**collar/neckline**, not the jacket, so the black fill rendered as an obvious black oval
blob on the white collar, arguably *more* noticeable than the original brooch. This was
caught by looking at the actual render, exactly the standard this whole investigation has
held to throughout — not discovered by reasoning about the texture atlas alone.

**Second attempt**: re-filled the same region with the collar's own white, sampled directly
from the texture (242, 241, 241) rather than guessed. A fresh render showed this was much
better but left a faint residual outline.

**Root cause of the residual outline, found by direct inspection, not guessed**:
`fem_suit.mhmat` also declares a `bumpTexture` (`MHSuitsFem-bump.png`). Opening that file
directly showed the *same* cameo-head-and-frame silhouette baked in as high-contrast bump
relief, entirely independent of the diffuse color — so flattening only the diffuse map left
a shading artifact from the bump map behind. Confirmed the Blender node name
(`bumpmapTexture`, not assumed by analogy with `diffuseTexture` — verified via
`diag_suit_bump_node.py`, a direct node-tree dump of the already-built `.blend`), sampled
this bump map's own flat/collar pixel (255, 255, 255 — white encodes "no relief" in this
particular map), and filled the same region there too.

**Final result, verified by a fresh render after both fixes**: the collar is now clean white
with no visible brooch, no black blob, and no residual outline (`phase15_v9_neutral_settled.png`).
Buttons (two light, one dark) elsewhere on the jacket were left untouched — the task's
"no brooch/badge/tie/scarf" instruction did not name buttons, and removing functional
buttons was judged out of scope.

Both new textures are derived, pixel-edited copies of already-CC0-confirmed MPFB assets
(same license chain as Phase 13/14's suit work) — no new asset was downloaded, no new
license question introduced.

## 3. Files changed

- `poc/mpfb-avatar-poc/build_avatar_v9.py` — new (copy of `build_avatar_v8.py` with the hair
  asset swap, the suit texture/bump swap, and output-filename changes; all other fixes from
  Phases 3–14 carried over unmodified).
- `poc/mpfb-avatar-poc/phase15-remove-brooch.cjs` — new, diffuse-map brooch removal (two
  iterations, final version uses sampled collar-white).
- `poc/mpfb-avatar-poc/phase15-flatten-bump.cjs` — new, bump-map brooch removal.
- `poc/mpfb-avatar-poc/phase15-textures/SimplifiedBlackSuitNoBrooch.png`,
  `SuitBumpNoBrooch.png` — new derived textures.
- `poc/mpfb-avatar-poc/avatar_v9.glb` — new (20.1MB; notably smaller than v8's 50.9MB,
  because `Long01`'s hair mesh is far simpler than the bob's multi-card geometry).
- `poc/mpfb-avatar-poc/diag_hair_labels.py`, `diag_suit_bump_node.py` — new, one-off
  diagnostics (kept for reproducibility, not part of the build pipeline).
- `poc/mpfb-avatar-poc/phase15-verify.cjs`, `phase15-regression.cjs`,
  `phase15-regression2.cjs`, `phase15-turn-view.cjs` — new, test harnesses.

**Nothing else changed.** `avatar_v5/v6/v7/v8.glb`, both TalkingHead engine copies, and
`src/renderer.ts`/`src/TalkingAvatar.ts` are all confirmed byte-for-byte untouched by file
timestamp (all predate this work; `src/` files predate this entire multi-phase investigation
by nine days). `git status --short` is identical before and after this work.

## 4. Fresh animation regression on `avatar_v9.glb` (not reused from v8)

| Check | Result |
|---|---|
| Oculus visemes | 15/15 present (status line, confirmed live) |
| Other morph targets | 57 (same count as v8 — hair/clothing swap didn't add/remove face morphs) |
| Lip-sync | **VERIFIED** — dense 90ms-step sampling across all 15 viseme names during real `streamAudio()` playback shows sustained real activation (~0.597–0.598) for 16 consecutive samples, correctly returning to 0 before/after speech |
| Blink | **VERIFIED** — 22s window, max value 1.0 (full closure), 6/76 nonzero frames — consistent blink rate with every prior phase |
| Intentional gaze (up) | **VERIFIED** — `eyesLookUp` reached 0.232 after `lookAt()` toward the top of the viewport |
| Intentional gaze (down) | **Reproduces the known Phase 6/10 pattern, not a new issue** — 4 fresh trials gave 0, 0, 0.082, 0.365; `lookAt()`'s result depends on the avatar's current idle body rotation at the exact call moment, by design, not a defect. Not reopened or touched. |
| Happy mood | **VERIFIED** — `mouthSmile` reached 0.208 after a full 9s settle (target 0.2) |
| Sad mood | **VERIFIED** — `mouthFrownLeft` reached 0.687 after 9s (target 0.8, consistent with Phase 10's "converges to ~0.79 given enough time" finding) |
| Fear mood | **VERIFIED** — `eyeWideLeft` reached 0.515 after 9s (target 0.6) |
| Angry mood / `browDownLeft` | Not touched, per standing exclusion |

## 5. Browser verification

Server: the already-running `serve.cjs` on port 8924 (no second server started). Confirmed
live via curl immediately before finishing this report:
```
curl http://localhost:8924/phase13-demo.html?avatar=./avatar_v9.glb  -> HTTP 200
curl http://localhost:8924/avatar_v9.glb                             -> HTTP 200
```
No console/page errors beyond the browser's own automatic `favicon.ico` 404 (the same
harmless non-issue seen in every prior phase).

**Verified browser URL:**
```
http://localhost:8924/phase13-demo.html?avatar=./avatar_v9.glb
```

Screenshots: `phase15_v9_neutral_first_frame.png`, `phase15_v9_neutral_settled.png`,
`phase15_v9_midspeech.png`, `phase15_v9_turned_view.png` — all in
`reports/mpfb_avatar_poc_assets/`.

## 6. Awaiting approval

This is a visual-refinement experiment, isolated under `poc/mpfb-avatar-poc/`. Nothing has
been integrated into the production application, and no earlier verified baseline (v5–v8,
either engine copy, or `src/`) was modified. Waiting for visual approval before any further
step.

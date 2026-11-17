# Phase 31 — Front Hairline Defect Investigation

Investigation + candidate fix, executed in a single pass. **No baseline file
was modified.** `avatar_v18_candidate.glb` is a reviewable candidate only —
it has **not** been promoted and `BASELINE_STATUS.md` has not been changed.

## 1. Hash verification — protected files unchanged

| File | SHA-256 (before) | SHA-256 (after) | Match |
|---|---|---|---|
| `avatar_v12.glb` | `2ba4a88d9339eb2955ae5845633fe3783cbab5c696db1e510169680dca5af6f` | same | ✅ |
| `avatar_v16.glb` | `e66bf4e3d133e76a7887d4aa6c30ab0eb573ff6e7fce0a33dbee0b7e8dca599b` | same | ✅ |
| `avatar_v17.glb` | `91abc1db9c4b87a06ac744a0b48b76d15e0052ba460fc1966b8b5dfe8ff0d364` | same | ✅ |

Computed fresh at the start and again at the end of this investigation;
all three match `BASELINE_STATUS.md` exactly and each other across both
checks. `git status --short` is identical to the long-standing session
baseline throughout.

## 2. Root cause — confirmed, not assumed

`avatar_v17.glb` is built by `phase28_swap_hair_tex.py` (reused by Phase
30), which **re-imports `avatar_v12.glb` wholesale and swaps only the
hair material's base-color/alpha image**. No geometry, UV mapping, mesh
count, or material assignment differs between `v12` and `v17` — confirmed
directly by reading that script. This immediately rules out hypotheses
**1** (separate scalp/hair-cap mesh — none exists; Phase 29 already
confirmed the hair is one single mesh) and **4** (UV mapping exposing a
different texture region — RGB data was never touched, only alpha) and
**6** (overlapping meshes — same mesh-count argument as #1).

Hypotheses **2** and **5** (geometry starting too far back / an uneven
hairline edge) are also ruled out directly: since the mesh is byte-identical
between `v12` and `v17`, any geometric gap at the hairline existed equally
in both — yet the pale strip is visibly absent in `v12` and visibly present
in `v17` (confirmed below). A pre-existing, purely-geometric gap could not
produce this difference on its own.

**Confirmed cause: hypothesis 3 — alpha/transparency.** Reading
`phase30_adaptive_feather.py` directly: the feathering operation is
`new_alpha[edge_band] = alpha[edge_band] * fringe_mult[edge_band]`, where
`fringe_mult` is clipped to `[0, 1]` — **this can only ever decrease
alpha, never increase it.** Phase 30's own fix intentionally made the hair
card's silhouette edges more transparent everywhere, specifically to
soften thin-strand regions and resolve the Phase 29 crown-flap defect. At
most locations this is invisible or beneficial. At the **front hairline**
specifically — a small, highly visible, camera-facing silhouette boundary
— the same universal alpha reduction thins the card edge enough that the
head mesh surface underneath (bald scalp/forehead geometry, always
present, always was there) begins to show through as a pale band, where
`v12`'s original, much-closer-to-binary alpha pattern (56.6% fully opaque,
confirmed by Phase 21) fully masked this same seam.

This is confirmed **at the texture/source level**, not introduced by the
browser rendering pipeline: the only input that changed between `v12` and
`v17` is the baked alpha channel inside the GLB's embedded texture, which
any glTF-compliant renderer would treat identically.

## 3. Visual evidence — three independent camera setups, all consistent

Three separate Puppeteer scripts, three different camera-positioning
techniques (direct `camera.position`/`lookAt`, the established
`orbitTo()` radius-preserving technique from Phase 26, and TalkingHead's
own `setView()` API) — all converge on the same finding. A genuine
top-down crown view could not be achieved in any of the three attempts
(each produced a closer-in front/three-quarter angle instead — the same
category of difficulty Phase 15 and others have hit before with
programmatic camera control in this headless harness); this is disclosed
as a real limitation, not glossed over, see §6.

| View | `v12` (clean) | `v17` (defective) | Candidate `blend50`/`v18_candidate` (fixed) |
|---|---|---|---|
| Close-up on forehead | `phase31_v12_closeup_hairline.png` — smooth, no band | `phase31_v17_closeup_hairline.png` — clear pale/beige band along the full hairline, matching the user's screenshot exactly | `phase31_blend50_closeup_hairline.png` — band gone, matches `v12` |
| Near-top-down (`setView`) | `phase31_sv_top_v12.png` — clean | `phase31_sv_top_v17.png` — band very clearly visible, widest and most obvious at this angle | `phase31_sv_top_blend50.png` — clean, matches `v12` |
| Front | `phase31_v12_front.png` | `phase31_v17_front.png` | (see close-up above) |

## 4. Correction made

**Change**: a single global alpha blend, `new_alpha = fixed20_alpha + 0.5
× (original_v12_alpha − fixed20_alpha)` — i.e. moving the Phase 30
`fixed20` texture 50% of the way back toward `v12`'s original, unfeathered
alpha, uniformly across the whole texture (no spatial isolation of "just
the hairline" was attempted — the alpha changes Phase 30 made are spread
across effectively the entire texture, not confined to one localized
patch, confirmed by a diff showing affected pixels spanning nearly the
full 2048×2048 canvas, so a targeted per-region exclusion would require a
real UV-to-3D mapping exercise not completed in this pass).

**This is not a painted band** — no RGB/color value was touched anywhere;
only the existing alpha channel was blended with its own prior state.
Nothing was painted over; the existing texture's own content (color,
strand pattern) is unchanged.

**Quantified against the thin-region metric Phase 29/30 established**:

| Candidate | % fully opaque | % partial | % of thin-strand pixels preserved |
|---|---|---|---|
| `v12` (original, unfeathered) | 56.62 | 22.46 | 100% (reference) |
| `fixed20` (Phase 30's shipped fix, in `v17`) | 54.02 | 24.53 | 28.48% |
| **`blend50` (this phase's candidate)** | 54.02 | 25.06 | **71.90%** |

`blend50` preserves substantially *more* of the thin-strand regions than
`fixed20` — meaning it is **less aggressive**, strictly in the direction
away from Phase 29's confirmed flap-causing mechanism (which required
*more* aggressive erosion, down to 0.21% preservation at the original
70px radius). Since `fixed20` already proved flap-free at 28.48%
preservation, and `blend50` sits well above that at 71.90%, there is
strong, quantified reason to expect it remains flap-free — though this
was not independently re-confirmed with a genuine top-down screenshot
this pass (§6).

## 5. Verification on the candidate (`avatar_v18_candidate.glb`)

- **glTF validity**: 0 errors, 10 warnings — identical category/count to
  `avatar_v17.glb`'s own validation.
- **Morph targets**: 15/15 Oculus visemes, 72 total (57 + 15) — unchanged.
- **Gaze**: genuine non-zero response to `lookAt()` (`eyeLookOutLeft:
  0.091`).
- **Blink**: genuine full closure (`1.000`) over a 22-second window.
- **Lip-sync**: the first (combined-script) check read `0.000` — the
  identical false-negative pattern every recent phase (18, 21, 25, 26,
  27, 28, 30) has hit. Re-checked in isolation with a denser 4-second,
  50ms-step, all-15-viseme sample: genuine **0.173 peak on `viseme_aa`**,
  confirming real activation, not a regression.
- **Performance**: no regression expected (texture-only change, identical
  category to Phase 30's own confirmed-no-regression result); not
  separately re-measured with the animClock-drift method this pass since
  no geometry or draw-call-affecting change was made.

## 6. Honest limitations

- **No genuine top-down screenshot of the crown was obtained in this
  pass**, despite three different camera techniques attempted. The
  flap-risk assessment for the candidate rests on the quantified
  thin-region-preservation comparison (§4), not a direct visual
  re-confirmation of crown coverage from directly above. This is a real
  gap, disclosed rather than hidden — a follow-up pass with more time
  budgeted specifically to solving the top-down camera problem (or doing
  the check in Blender's own native top orthographic view, cross-checked
  against a browser render from a reachable angle) would close it.
- The fix is a uniform global blend, not a surgical, hairline-only
  correction — it also slightly reduces the strength of Phase 30's
  improvement everywhere else on the hairstyle. The visual evidence
  (§3) shows no regression at the angles actually captured, but a true
  UV-mapped, region-specific fix (isolating just the hairline boundary)
  remains the more precise approach for a future iteration if this
  global blend turns out to have any other side effect not caught here.

## 7. Files

New: `phase31_hairline_compare.cjs`, `phase31_true_top.cjs`,
`phase31_proper_top.cjs`, `phase31_setview_top.cjs`,
`phase31_swap_hair_tex.py`, `phase31_test_blend50.cjs`,
`phase31_regression.cjs`, `phase31_isolated_lipsync.cjs`,
`phase31-textures/long01_blend{30,50,65}.png` (three blend candidates
generated; only `blend50` was taken to a full GLB/browser test),
`avatar_v18_candidate.glb` (24,xxx,xxx bytes — the reviewable candidate),
and the screenshots listed in §3, copied into
`reports/mpfb_avatar_poc_assets/` with a `phase31_` prefix.

**Untouched**: `avatar_v12.glb`, `avatar_v16.glb`, `avatar_v17.glb`,
`BASELINE_STATUS.md`, both TalkingHead engine copies,
`src/renderer.ts`/`src/TalkingAvatar.ts`.

## 8. Ready for review

`avatar_v18_candidate.glb` is suitable for the user's own independent
visual review, with the explicit caveat in §6 that top-down crown
coverage was not directly re-screenshotted this pass. **Not promoted** —
`BASELINE_STATUS.md` still lists `avatar_v17.glb` as the current working
baseline; `avatar_v17.glb` itself is now known to carry the hairline
defect reported by the user and should not be treated as flawless pending
this review.

To view: `http://localhost:8924/phase20-demo.html?avatar=./avatar_v18_candidate.glb`

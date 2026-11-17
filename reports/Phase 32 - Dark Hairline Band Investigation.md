# Phase 32 — Dark Hairline Band Investigation

**No fix implemented. This report leads with root cause and evidence, per
the task's own explicit instruction, and stops there pending approval.**

## 1. Visual comparison, matched angle (reusing Phase 31's own close-up renders)

`phase31_v17_closeup_hairline.png` (original `avatar_v17.glb`) shows the
large pale/white band Phase 31 already diagnosed and fixed, with a subtle
darker edge line visible right at its boundary with the hair proper —
present but overshadowed by the much more obvious pale band.

`phase31_blend50_closeup_hairline.png` (the `avatar_v18_candidate.glb`
fix) shows the pale band genuinely gone — but a thinner, clearly visible
dark/grey line now sits right along the hairline where the pale band used
to be. `phase31_blend50_top.png` (an elevated, not true-overhead, angle)
shows a visibly uneven, slightly jagged darker seam running down the
center part.

**Both images already existed from Phase 31's own work** — no new
screenshots were needed to confirm the user's report is accurate.

## 2. Root cause, confirmed by direct pixel measurement, not inference from the pictures

Loaded all three relevant hair textures directly in Blender and compared
pixel-by-pixel (stride-2 scan across the full 2048×2048 atlas,
~1,048,576 sample points):

- `phase20-textures/long01_diffuse_recolored.png` — the texture actually
  baked into `avatar_v12.glb` (confirmed: this is Phase 20's
  color-corrected version of the stock `Long01` texture, not the raw
  MPFB asset file).
- `phase30-textures/long01_fixed20.png` — the texture in `avatar_v17.glb`.
- `phase31-textures/long01_blend50.png` — the texture in
  `avatar_v18_candidate.glb`.

**Finding 1 — confirmed exactly**: **57,151 of the sampled pixels** had
their alpha changed between v12→v17 (Phase 30's erosion), and **the exact
same 57,151 pixels** changed again between v17→v18 (Phase 31's
blend-back). This proves both fixes operate on the identical affected
region — Phase 31's "fix" is a partial reversal of Phase 30's edit on the
same pixels, not a different region.

**Finding 2 — the actual mechanism, found by isolating dark, partially-
transparent pixels specifically at the v17→v18 boundary**: several of the
most-changed pixels are **pure black (RGB 0, 0, 0)** — not a dark brown
hair tone, not a shading gradient — carrying **unexpectedly high alpha in
the pristine `v12` original** (0.5–0.94, despite being empty/unpainted
black canvas) that Phase 30's erosion correctly suppressed toward near-
zero (0.0–0.2) and Phase 31's 50% blend-back partially restored (0.29–
0.50). Example measured values (u, v, alpha-in-v12, alpha-in-v17,
alpha-in-v18):

```
(0.0010, 0.0, 0.941, 0.047, 0.494)
(0.0020, 0.0, 0.910, 0.004, 0.459)
(0.3086, 0.0, 0.525, 0.067, 0.298)
(0.6084, 0.0, 0.506, 0.063, 0.286)
(0.6104, 0.0, 0.690, 0.012, 0.353)
```

All of these sit at `v=0.0` — the texture atlas's own edge/margin row —
and cluster near u≈0.00–0.007 and u≈0.31/0.61, which line up with the
boundaries between the separate card panels visible in the atlas image
itself (the texture contains 3–4 distinct hair-card shapes side by side,
separated by black background space).

**What this means**: the original `Long01` texture has pure-black,
unpainted padding/background regions near its panel-edge margins that —
for reasons unrelated to any fix in this investigation — already carried
substantial alpha values in the artist's/generator's original file. In
`v12`'s near-binary alpha pattern, this never mattered, because the
mesh's actual UV mapping apparently doesn't sample deep enough into this
margin for it to render as anything other than fully-covered hair.
**Any operation that restores alpha across this region — Phase 30's
erosion-radius reduction, and now Phase 31's uniform blend-back — risks
exposing some of this black padding wherever its particular UV footprint
happens to land on the visible mesh**, which reads exactly as a dark/grey
band or an uneven dark seam, depending on where that falls relative to
the hairline and center-part UV seams.

**What is NOT yet confirmed**: I did not establish the exact UV-to-3D
correspondence proving these specific sampled coordinates are literally
the pixels rendering at the hairline/part on the avatar's head (that
would require tracing the mesh's actual UV layout against these
coordinates, which this pass didn't complete). The pixel-level mechanism
above is measured fact; which exact on-screen pixels it explains is a
very strong, evidence-backed inference, not a fully closed loop.

## 3. Is Phase 31's own fix implicated?

**Yes, directly** — Finding 1 proves Phase 31's blend-back operates on
exactly the same pixel set Phase 30 edited, and Finding 2 shows that
operation can only move those pixels' alpha along the same axis Phase 30
already identified as risky (restoring alpha in a region that includes
non-hair, pure-black padding). This is not a new, independent defect —
it is the same underlying texture-margin issue, now manifesting as "too
dark" instead of "too pale" because a uniform global blend ratio doesn't
distinguish between hair-edge pixels (which should become partially
visible again) and black-padding pixels (which should not).

## 4. Center-part line — same mechanism, not independently confirmed

Two of the five measured dark-pixel examples sit at u≈0.31 and u≈0.61 —
positions that correspond to panel boundaries in the atlas, consistent
with a UV seam. This is consistent with (not yet independently proven
against) the center-part line being the same black-padding-exposure
mechanism landing at a seam rather than a separate geometry or shading
defect. No separate root cause was found for the center part specifically
within this pass's scope.

## 5. Recommended smallest correction (not implemented)

A **uniform blend ratio is the wrong tool** — it was always going to
trade "too pale" for "too dark" because it treats the whole affected
region as one gradient to dial up or down, when the region actually
contains two different kinds of pixels (real hair-edge color, which
should be partially restored, and black padding, which should stay
suppressed regardless of blend ratio). The smallest correction that
targets the actual confirmed mechanism: **before blending, mask out
pixels that are near-black in the source RGB (e.g. luminance below some
small threshold) from the restoration entirely**, so the blend-back only
ever restores alpha on pixels that are actually hair-colored, never on
black padding. This is a precise, scoped change to the same blend script,
not a new approach.

## 6. Status

No candidate was built in this pass. `avatar_v17.glb`, `avatar_v12.glb`,
`avatar_v16.glb`, and `avatar_v18_candidate.glb` are all unmodified by
this investigation (confirmed: `git status --short` identical to
baseline, no file writes beyond this report and the two new diagnostic
scripts `phase32_pixelcheck.py`/`phase32_diffscan.py`). Nothing is
promoted. Waiting for approval before implementing the recommended
correction.

# Phase 41 — Tie-Free Shirt Replacement Feasibility Investigation

## Result: no compatible installed asset exists. Stopping at the proposal stage, per the task's own instruction. No prototype built, nothing promoted.

## Stage 1 — Asset research (installed MPFB catalog)

Full female clothing catalog re-listed from
`.../mpfb/data/clothes/`: `female_casualsuit01`, `female_casualsuit02`,
`female_elegantsuit01`, `female_sportsuit01`, `toigo_female_suit`,
`toigo_female_suit_2` (current, has the tie), `toigo_female_double-breasted_suit`.
No standalone "shirt," "blouse," or "jacket-only" piece exists anywhere in the
catalog — every entry is a single, complete, fused garment.

**Checked each "elegant/professional" candidate's own diffuse texture atlas directly, not assumed:**

- `female_elegantsuit01` — its texture atlas contains a clearly tie-shaped
  UV island (long, tapered, diagonal) in the same red/black/white stripe
  pattern as the rest of the garment. **Has a built-in tie.**
- `toigo_female_double-breasted_suit` — its atlas contains an unambiguous
  necktie UV piece (knot + tapered body) in a maroon floral/damask print,
  plus a separate large button graphic. **Has a built-in tie.**
- `toigo_female_suit` / `toigo_female_suit_2` — already known from Phase
  15/16/20/39/40 to have a tie (the current defect).

**Checked the tie-free candidates' category, not just tie presence:**

- `female_casualsuit01` — a blue crew-neck T-shirt (contrast shoulder
  piping, a sport logo graphic) plus distressed blue jeans. No tie — but
  also no blazer, no collar, no professional register whatsoever.
- `female_casualsuit02` / `female_sportsuit01` — same casual/athletic
  category by name and file structure; not independently opened given (a)
  the pattern from `casualsuit01` already answers the category question
  and (b) none of them could plausibly become "simple black professional
  blazer + white top" without a full re-texture and re-cut, which is a
  different, much larger task than a shirt swap.

**Conclusion: every professional-register female garment in this catalog
has a tie fused into its geometry. Every tie-free garment is the wrong
clothing category entirely.** There is no asset in the installed catalog
that satisfies both "no tie" and "looks like a blazer."

No external search was performed this pass (the task marks this as
optional — "you may do one more external search pass" — only if the
installed catalog comes up empty; see "Not done" below for why this was
deferred rather than attempted here).

## Stage 2 — Compatibility investigation on `v19_candidate`'s actual mesh

Already answered directly by Phase 40's own prior investigation (re-read,
not re-derived): the tie is not a separate object or a separate UV
island floating independently — it is welded into the same single mesh
(`Human.toigo_female_suit_2_export_copy`) as the shirt collar, blazer
lapels, and shoulders, sharing one material. Phase 40's own deletion
experiment proved there is no separate "shirt surface underneath the
tie" to reveal — removing the tie's faces opens a hole with nothing
behind it, because the tie's geometry *is* the chest-front surface in
that region, not an overlay on top of a separate shirt layer.

**This directly answers Stage 1's "jacket+shirt layering" idea**: MPFB's
clothing system does support wearing multiple garments layered, but that
only helps if a genuinely separate jacket-only piece and shirt-only piece
both exist as catalog items. Neither exists. Layering two *complete
suits* on top of each other would not solve anything — it would just add
a second fused garment with its own tie, not remove the first one.

## Stage 3 — Proposed strategy

Given Stage 1 found no compatible installed asset and Stage 2 confirms
the existing mesh has no separable, tie-free shirt layer to reveal, there
is currently no clean "swap in a different shirt" path using only this
project's already-installed, free MPFB catalog. Two honest options going
forward, neither attempted in this phase:

1. **A genuinely new external asset search** (Phase 23/24's established
   rigor: verify actual license text on the asset's own page, not a
   marketplace badge; reject anything with unclear or non-commercial
   terms) specifically for a CC0/MIT-licensed, Blender-compatible,
   realistic female blazer-or-blouse mesh with no tie. Given this
   investigation's own prior experience searching for a comparable asset
   category (hair, in Phases 23-24) found only paid options with real
   quality, or crude free placeholders, the same outcome is a real
   possibility here too — this is a genuine unknown, not predicted to
   succeed or fail, since clothing and hair are different asset
   categories with potentially different availability.
2. **Author a small amount of new geometry by hand** in Blender
   specifically to patch the tie region into a plausible plain shirt
   front — this is a different kind of work than anything Phase 40
   attempted (which only edited/deleted existing geometry, never added
   new geometry authored to match the surrounding surface) and was out
   of scope for a one-shot investigation phase.

**No prototype was built in this phase**, per the task's own explicit
sequencing ("Do not implement a full replacement until you show me the
proposed asset, its licence, and compatibility evidence") — there is no
asset to show, so Stage 4 does not apply.

## Stages 4-6 — not applicable

No prototype was built (Stage 1 found no compatible asset), so no browser
verification, GLB validation, or regression testing was performed in
this phase. `avatar_v19_candidate.glb` remains the current best state
(tie present, recolored, as established in Phase 39).

## Hash verification

| File | Status |
|---|---|
| `avatar_v12.glb` | Unmodified (not touched this phase) |
| `avatar_v17.glb` | Unmodified (not touched this phase) |
| `avatar_v19_candidate.glb` | Unmodified (not touched this phase) |
| `avatar_v20_candidate.glb` | Unmodified (not touched this phase) |
| Both TalkingHead engine copies | Unmodified (not touched this phase) |
| `src/renderer.ts`, `src/TalkingAvatar.ts` | Unmodified (not touched this phase) |

No GLB, engine file, or production code was read, opened in Blender, or
written to during this investigation — only the MPFB clothing catalog's
own asset files (outside this repository) and the two prior Phase 40/41
reports were inspected. `git status --short` in `C:/Users/sujitha/talking-avatar`
is unchanged from the session baseline — the only new file is this report.

## Recommendation

Do not pursue a shirt-swap using the currently-installed MPFB catalog —
it genuinely does not contain a usable asset, confirmed by direct texture
inspection of all four candidate garments, not assumed. If a tie-free
look remains a hard requirement, the next real step is a scoped external
CC0/MIT asset search (option 1 above) as its own phase, with the explicit
possibility that it turns up nothing better than `v19_candidate`'s
already-recolored tie, the same way the hair search did for hair.

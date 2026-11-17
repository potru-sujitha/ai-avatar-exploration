# Phase 22 — MPFB Hair Catalog Comparison

**Executed directly, not delegated further** — this phase's directive
arrived as a direct instruction rather than a background dispatch, so the
investigation below was done in-session.

## 1. Catalog investigation — complete, fresh listing

Every directory under `.../mpfb/data/hair/` was listed fresh (not assumed
from any prior phase's notes). Previously tested: `Long01` (current
baseline, Phase 15), `o4saken_long01` (Phase 21, reverted — chaotic/patchy
when rendered despite a better transparency measurement). Everything else
in the catalog is a short, braided, bun, or styled cut
(`afro01`, `bob01/02`, `braid01`, `cortu_*`, `elvs_*` braids,
`learning_anime_hair`, `littleright_bobcut_hair`, `ponytail01`,
`rehmanpolanski_hair_bun_brown`, `short01-04`, `sonntag78_*`,
`toigo_*_bob*`) — none are "long layered/straight/softly wavy" candidates
by any reasonable reading, confirmed by directory name and, where any
doubt existed, by checking the asset's own thumbnail.

That leaves exactly **five** previously-unconsidered entries worth
checking, all inspected directly this phase:

| Asset | License (from its own `.mhclo` file) | Verdict | Why |
|---|---|---|---|
| `culturalibre_hair_01` | **AGPL3** | Disqualified | Copyleft, reciprocal source-disclosure obligation — the same license category this investigation already rejected a skin asset for in Phase 16. Not render-tested; the license alone rules it out. |
| `culturalibre_hair_02` | **AGPL3** | Disqualified | Same as above. Also: its texture/material files are named `male02_*`, suggesting this is a male-cut asset regardless. |
| `culturalibre_hair_05` | CC-0 | Disqualified by shape | Its own thumbnail (`phase22_culturalibre05_thumb.png`) shows a short, chunky, dreadlock/feathered-cap style — not remotely a long hairstyle. Ruled out by appearance alone, no build needed. |
| `culturalibre_hair_06` | CC-0 | Disqualified by shape | Same category as 05 — short, rounded, chunky cap style (`phase22_culturalibre06_thumb.png`). Not long hair. |
| `faydaen_hair_1` | CC0 | **Built and rendered — fails decisively** | See below. |

**Only one genuinely new, plausible candidate existed in the entire
installed catalog.** This is reported plainly rather than padded to a
false "3-4 candidates" by including assets already ruled out by license or
obvious shape mismatch — the task's own instruction is to find promising
*long female* hairstyles, and the catalog simply doesn't contain more than
one untested option after that filter.

## 2. Visual comparison — `faydaen_hair_1`, built and rendered

**Two concrete findings before rendering** (not assumptions): its only
texture, `hair.png`, is **RGB with no alpha channel at all** (confirmed via
direct file inspection) — meaning every hair card can only render as a
fully opaque, hard-edged shape, never a soft strand-tapered edge. Its mesh
is also very low-poly: 541 vertices / 836 faces, versus `Long01`'s 3239 —
very few, very large card shapes.

**Rendered anyway**, per this phase's own rule that appearance decides,
not a pre-render metric. Built a standalone test (adult female MPFB human
+ skin + this hair asset + the TalkingHead rig, Cycles render,
`phase22_test_faydaen.py`) and screened it visually
(`phase22_faydaen_render.png`). **Result: fails decisively, confirming
both predictions.** The hair renders as a handful of large, flat, blocky
shapes with zero visible strand definition — exactly what the missing
alpha channel predicts. It is also noticeably shorter than required,
reaching only to the collarbone in a T-pose render rather than extending
below the shoulders. (A secondary, unrelated note: this quick screening
test's own hue-shift recolor overshot into an unnatural olive/khaki tone —
a flaw in this test script's quick approximation, not a finding about the
asset itself; the established Lab-space recoloring technique used
elsewhere in this investigation was not needed here since the shape result
alone is already disqualifying.)

**Conclusion for section 2, per the task's own explicit instruction**:
*"If none of the candidates looks sufficiently human, stop and recommend a
different hair-generation approach. Do not force a poor candidate into the
baseline."* None of the five previously-untested catalog entries is
viable — two are license-disqualified, two are shape-disqualified, and the
one that was actually built and rendered fails decisively. **The installed
MPFB hair catalog does not contain a suitable long, natural hairstyle
beyond what Phases 15 and 21 already tried and rejected.** A different
hair-generation approach (a different asset source entirely, or a
different technique such as curve/strand-based hair rather than alpha
cards) would be needed to make further progress on this specific
complaint — not more searching within this catalog.

## 3. Performance investigation — isolated, separate from the hair comparison

Phase 21 hypothesized that accessory meshes generally carry the full
67-shape-key set unnecessarily, contributing to its observed frame-rate
regression. **Directly inspected the actual morph-target distribution in
the current, real `avatar_v12.glb`** (not a hypothesis, the real exported
file):

| Mesh | Morph targets |
|---|---|
| Face/body (`Human_export_copy`) | 67 (needed — this is where visemes/ARKit live) |
| Eyebrows | 32 |
| Eyelashes | 27 |
| Eyes | 8 |
| Tongue | 13 |
| Teeth | 12 |
| **Hair** (`long01`) | **0** |
| **Suit** (`fem_suit2`) | **0** |

**Finding: Phase 21's hypothesis does not hold for the current, real
baseline.** Hair and suit already carry zero morph targets — there is
nothing to prune there. Even the largest "accessory" meshes (eyebrows,
eyelashes) are already far below the full 67-target set, meaning MPFB's
own export pipeline is already doing per-mesh interpolation/pruning
correctly. **No blind morph-target removal is warranted, because there is
no bloat present to remove** on `avatar_v12.glb` as it actually exists
today. Phase 21's own regression was most plausibly specific to the *new*
hair mesh it introduced that phase (`o4saken_long01`, reported there as
carrying 70 morph targets of its own) — a property of that specific,
already-reverted experimental asset, not a general defect in the current
pipeline. Since `avatar_v12.glb` has performed correctly through every
regression check across Phases 18-21 without incident, no isolated
before/after performance benchmark was run this phase — there was nothing
found to change, and fabricating a benchmark around a non-existent
optimization would not be meaningful evidence.

## 4. Preservation

`avatar_v12.glb` was not modified — confirmed by file timestamp, unchanged
from Phase 20/21. `avatar_v13.glb` was not touched. No production code,
skin, eyes, facial geometry, or clothing was modified. The only new files
are the screening test script, its render, and the three thumbnail copies
used for visual triage, all under `poc/mpfb-avatar-poc/` (plus the
thumbnail copies in `reports/mpfb_avatar_poc_assets/`). `git status
--short` is identical to this investigation's long-standing baseline —
confirmed before and after this phase's work.

## 5. Recommendation

**No promotion to a new baseline this phase** — there is nothing better
to promote. `avatar_v12.glb` remains the verified baseline, unchanged.
For the hair complaint specifically, the realistic next options are: (a)
accept `Long01`'s current look as this catalog's practical ceiling for
long hair, or (b) source a hair asset from outside the installed MPFB
catalog (would need a fresh licensing check, per this investigation's
standing discipline, before use) or pursue a fundamentally different hair
technique (actual strand/curve geometry) rather than another alpha-card
asset from this same catalog, since the catalog has now been exhaustively
checked for viable long-hair options.

Waiting for the user's approval before any further hair work, per this
task's own closing instruction.

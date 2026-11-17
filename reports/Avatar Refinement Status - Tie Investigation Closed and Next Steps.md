# Avatar Refinement Status — Tie Investigation Closed, and Next Steps

**This is a documentation, verification, and next-step planning report.
No avatar asset, engine copy, or production code was changed by this
task.** The only file edited is `poc/mpfb-avatar-poc/BASELINE_STATUS.md`
(text corrected to remove staleness — no GLB promoted, nothing deleted).

## 1. Phase 44 closure and structural findings

Phase 44 (`reports/Phase 44 - Direct Knot Topology Reconstruction.md`)
investigated whether the necktie knot could be removed by directly
editing mesh topology — deleting the knot and bridging/reconstructing
the surrounding edge loops — as a 7th approach after 6 prior distinct
techniques (deletion, smoothing+recolor, plane projection,
shrinkwrap-to-body, boundary interpolation over the strip only, and over
strip+knot; Phases 20, 39, 40, 41, 42, 43) had all failed.

**Confirmed structural finding (re-verified, not re-run, for this
report via Phase 44's own true edge-connectivity analysis):** the suit
mesh `Human.toigo_female_suit_2_export_copy` (9,211 vertices) is not one
continuous surface. It is **38 mutually disconnected mesh islands**. The
collar flaps, the rounded knot blob, and the flat tie blade beneath it
are three separate islands sharing zero vertices or edges with each
other or with the collar — confirmed by a rainbow per-island render
(`phase44_rainbow_islands.png`) and an independent unlit-emission clay
render isolating just the tie+knot union in solid red
(`phase44_clay_tie_isolated.png`), which still leaves the knot's own
surface visibly gray/unpainted because it belongs to a third island not
included in that selection.

Because there is no real, shared edge loop between the knot and the
collar, "reconstruction" can only mean fabricating brand-new bridging
geometry across a genuine 3D gap between independent floating patches —
exactly the operation Phases 40/43 already attempted in four different
concrete forms, each failing on depth-mismatch/intersection grounds
(the real body/collar surface recedes into a sternum hollow at this
exact location, confirmed there via raycast probes). Topology
inspection did not open a new path; it explains precisely why none of
the prior 6 approaches could have worked, and why this 7th one doesn't
either.

## 2. The stop decision

**Formal decision: stop attempting to remove the necktie from this
specific suit mesh.** No further mesh deletion, smoothing, patching, or
topology reconstruction aimed at hiding or removing the tie will be
attempted on this asset. This is a geometric fact about the asset (3
disconnected islands with no shared boundary), not a tooling limitation
or a failure of effort — 7 independent techniques across Phases 20,
39–44 all failed for the same underlying reason. `avatar_v19_candidate.glb`'s
recolored (black) tie remains the practical ceiling on this point. Any
future revisit of this topic is explicitly scoped as either (a)
accepting `v19_candidate` as final here, or (b) a fundamentally
different, destructive sculpting pass the user would have to pre-approve
knowing it risks visible collar damage — never another non-destructive
geometry technique, since Phase 44's finding applies to that entire
category.

A full suit-asset replacement remains out of scope for this task, per
instruction — reserved as separate future research using only
verified-license open-source/free assets, not attempted here.

## 3. Protected baseline/candidate status — corrected, with fresh evidence

`BASELINE_STATUS.md` was checked against real files, not assumed. It was
confirmed stale: it predates Phases 31–44 and still described
`avatar_v17.glb` as "the real current state to build future refinement
on." Fresh evidence gathered for this report shows that claim is no
longer accurate — see below.

**Files actually on disk under `poc/mpfb-avatar-poc/`** (sizes/timestamps
and SHA-256 confirmed fresh, not reused from any prior report):

| File | SHA-256 | Size | Timestamp |
|---|---|---|---|
| `avatar_v12.glb` (original rollback) | `2ba4a88d...9af6f` | 24,655,760 B | Nov 15 19:28 |
| `avatar_v17.glb` (promoted baseline) | `91abc1db...d364` | 24,129,304 B | Nov 16 12:16 |
| `avatar_v18_candidate.glb` | `7607f4cf...a20ad5` | 24,084,296 B | Nov 16 12:43 |
| `avatar_v18_candidate_v2.glb` | `cb8a4a94...6c98988` | 24,128,704 B | Nov 16 13:19 |
| `avatar_v18_candidate_v3.glb` (real hairline fix) | `38d66958...0731d1` | 23,175,556 B | Nov 17 10:37 |
| `avatar_v19_candidate.glb` (best available, unpromoted) | `664992ec...8f84c39` | 24,305,912 B | Nov 17 11:54 |
| `avatar_v20_candidate.glb` (rejected) | `15db6610...24e785f` | 24,288,996 B | Nov 17 13:54 |
| `avatar_v21_candidate.glb` (rejected) | `e747c496...04269ae4` | 24,368,376 B | Nov 17 14:52 |

All 8 hashes are distinct — no accidental overwrite between any of them.
These match the hashes already recorded in Phase 38's and Phase 44's own
reports, confirming no drift since those phases.

**The critical finding — fresh browser evidence, not assumption:**
`avatar_v17.glb` (Nov 16 12:16) was built and promoted *before* Phase
38's skin-texture stubble fix existed. The fix that actually resolved
the hairline defect (`avatar_v18_candidate_v3.glb`, Nov 17 10:37) was
built from `avatar_v18_candidate_v2.glb` — a different branch entirely,
descended from Phase 33's hair-alpha work, never merged back into `v17`.
`v17` only ever received Phase 30's *hair-texture* alpha-feathering fix;
it never received Phase 38's separate *skin-texture* scalp-stubble fix,
because that defect and its fix were discovered on a branch that forked
away from `v17` before Phase 38 happened.

To confirm this is real and not just a lineage inference, both files
were loaded fresh in the actual browser (Puppeteer + headless Chrome,
SwiftShader, cache disabled, `phase20-demo.html` harness, port 8924) at
the same established revealing framing used throughout this
investigation (`setView('head', {cameraDistance:-0.42, cameraY:0.56,
cameraX:0})`, panel hidden) and at a tighter macro crop
(`cameraDistance:-0.1`, 1600×1200 viewport). The on-screen status panel
was read in both cases to confirm the correct file was actually loaded
(`Avatar: ./avatar_v17.glb` and `Avatar: ./avatar_v19_candidate.glb`
respectively — not assumed from the query string).

**Result: `avatar_v17.glb` still visibly shows the pale, rough-textured
hairline band at the hair/forehead boundary. `avatar_v19_candidate.glb`
(which carries the Phase 38 fix) shows a visibly smoother, cleaner
blend at the same boundary, at the same camera framing.** This is a
direct visual confirmation, at the resolution available in this
rendering environment, consistent with Phase 38's own documented fix
(washing out high-variance stubble speckle via local-area averaging
while preserving the skin-tone gradient) — and with the fact that `v17`
never received that fix.

**Preservation confirmed:** `v17`, `v12`, and `v19_candidate` were not
modified, renamed, or deleted by this task — their hashes above are
unchanged from Phase 38's/Phase 44's own records. `v19_candidate` was
**not promoted** by this task. No existing candidate GLB was modified.
Both TalkingHead engine copies and `src/renderer.ts`/`src/TalkingAvatar.ts`
were not touched (confirmed via `git status --short`, below).

**`BASELINE_STATUS.md` was corrected** (documentation only — table text
and notes updated to record the full `v18`/`v19`/`v20`/`v21` candidate
chain, the necktie closure, and the fact that `v17` is confirmed stale
for the hairline issue). No GLB was promoted by this edit.

## 4. Next recommended refinement — not implemented, awaiting approval

Two distinct, justified items, in priority order. **Neither has been
implemented.**

**(a) Highest priority — resolve the baseline staleness itself, not a
new refinement.** The single most valuable next action is not a new
visual investigation at all: it is promoting the already-verified
hairline fix (`avatar_v18_candidate_v3.glb`'s skin-texture change,
carried into `avatar_v19_candidate.glb`) so the "working baseline" the
project actually builds on stops being a file that visibly still has a
defect fixed days ago on an unmerged branch. This is exactly the
"natural hair appearance/hairline, if the existing unresolved issue
remains" priority named in this task's own instructions — confirmed
above, with fresh evidence, to remain unresolved in the promoted file.
This requires the user's explicit visual approval before any GLB is
renamed or promoted, per standing project rules, and is not performed
here.

**(b) Second priority — the known, unintegrated shoulder-fleck fix.**
Unrelated to the tie, hair, skin tone, eye color, or mood expressions.
Phase 16 first found scattered white flecks on the jacket shoulders
(visible again in this task's own fresh screenshots of both `v17` and
`v19_candidate` — e.g. the blotchy white marks on both shoulders in
`phase45_v17_hairline_check.png`/`phase45_v19_hairline_check.png`).
Phase 17 (`reports/Avatar Visual Refinement - Shoulder Fix and Natural
Smile - Phase 17.md`) isolated the exact mechanism — a one-time
GLTFLoader texture-upload/mipmap-generation quirk on the suit's diffuse
map, not an anisotropic-filtering or normal-map interaction — and
verified a real fix (re-triggering `texture.needsUpdate = true` on that
map after initial render) works reliably **when triggered from outside
the page** via Puppeteer, but could not get the same retrigger to fire
reliably from code running inside the page itself in that test
environment. The defect has been root-caused and a working fix
exists; it was simply never gotten to integrate reliably in-page. This
directly matches this task's "overall browser-rendering consistency"
priority and is explicitly unrelated to every excluded topic (tie, eye
redness, angry mood, full suit replacement). It would need new
in-page integration work (and fresh verification on the current
baseline) before being proposed as a candidate — not attempted in this
report.

Explicitly not pursued, per instruction: eye redness (already resolved
in Phase 18; not reopened), the `angry` mood's broken `browDownLeft`
(out of scope since Phase 6), and any full suit replacement (reserved
separately).

## 5. Files inspected / changed

**Inspected only:** `poc/mpfb-avatar-poc/BASELINE_STATUS.md` (pre-edit),
`reports/Phase 44 - Direct Knot Topology Reconstruction.md`, `reports/Phase
38 - Hairline Defect Real Fix.md`, `reports/Avatar Visual Refinement -
Shoulder Fix and Natural Smile - Phase 17.md`, `reports/avatar_v17
Baseline Promotion.md`; all 8 candidate GLBs listed in §3 (size/timestamp/
hash only — no GLB was opened for editing); `git status --short` output.

**Changed:** `poc/mpfb-avatar-poc/BASELINE_STATUS.md` (text corrected,
no GLB reference changed to point at a different promoted file). This
report (new file).

**Not touched:** every avatar GLB, both TalkingHead engine copies,
`src/renderer.ts`, `src/TalkingAvatar.ts`. Confirmed via `git status
--short`: the only entries are the long-standing untracked `poc/`,
`reports/`, `demo/`, `research_notes/` directories and the pre-existing
modified files (`.gitignore`, `package-lock.json`, `src/TalkingAvatar.ts`,
`src/renderer.ts`) already present at the start of this session — none
of which this task added to.

## 6. Browser screenshots / evidence

New, this task, all under `poc/mpfb-avatar-poc/`:

- `phase45_v17_hairline_check.png` / `phase45_v19_hairline_check.png` —
  full head-and-shoulders, revealing camera framing, status panel
  visible before hiding, confirming the correct file loaded.
- `phase45_v17_hairline_zoom.png` / `phase45_v19_hairline_zoom.png` —
  tighter forehead/hairline crop, same framing, both files.
- `phase45_v17_macro.png` / `phase45_v19_macro.png` — high-resolution
  (1600×1200) macro crop isolating the hair/forehead boundary; this is
  the pair that most clearly shows `v17`'s rougher, pale, mottled band
  versus `v19_candidate`'s smoother blend at the same location.
- Scripts: `phase45_hairline_check_v17_vs_v19.cjs`,
  `phase45_hairline_crop.cjs`, `phase45_hairline_macro.cjs` — all
  read-only against existing GLBs, none write to any GLB.

Reused as evidence (not re-captured): `phase44_rainbow_islands.png`,
`phase44_clay_tie_isolated.png` (Phase 44's own topology renders, cited
in §1).

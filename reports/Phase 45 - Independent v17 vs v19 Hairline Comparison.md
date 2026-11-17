# Phase 45 — Independent Hairline Comparison and Promotion Readiness

**Visual verification only. No asset was modified, renamed, promoted, or
deleted. No production integration. No unrelated fixes attempted.**

## 1. Asset verification

Read `poc/mpfb-avatar-poc/BASELINE_STATUS.md` and the relevant Phase 38
(`reports/Phase 38 - Hairline Defect Real Fix.md`) and Phase 44
(`reports/Phase 44 - Direct Knot Topology Reconstruction.md`) reports.
Fresh SHA-256 hashes, computed for this task (not reused from any prior
report):

| File | SHA-256 | Unchanged since |
|---|---|---|
| `avatar_v12.glb` | `2ba4a88d...5af6f` | Every prior report in this investigation |
| `avatar_v17.glb` | `91abc1db...d364` | Phase 30 promotion, confirmed in every subsequent phase |
| `avatar_v19_candidate.glb` | `664992ec...8f84c39` | Phase 39/44/this task's own prior report |
| `TalkingHead/modules/talkinghead.mjs` (original) | `ecf4e118...d341b9` | Entire investigation |
| `phase8-talkinghead-experiment/.../talkinghead.mjs` (isolated copy) | `544f961a...f66ce4638` | Phase 34c |

All distinct from each other, all matching their previously recorded
values exactly. Neither `v17` nor `v19_candidate` has changed.

## 2. A scripting bug found and fixed mid-task

My first two capture attempts for this comparison were wrong and are
**not** used as evidence below — flagged honestly rather than silently
redone:

1. **Attempt 1** used `window.head` to call `setView()`. The actual page
   (`phase20-demo.html`) exposes the instance as `window.__head`, not
   `window.head`. Every `setView()` call silently threw inside a
   try/catch and was swallowed, so all 6 intended camera angles for
   both files were actually just the page's default constructor camera
   (`cameraView:'head', cameraDistance:0.8, cameraY:0.45`) — i.e. 6
   near-identical screenshots per file, not 6 different angles. Caught
   by comparing the images directly: they looked suspiciously alike.
2. **Attempt 2** fixed the variable name but used a fixed 18-second
   wait for the camera transition to finish. The transition's internal
   clock is driven by rendered-frame `dt`, which is throttled
   inconsistently in this headless/background-tab context — a
   diagnostic script confirmed the same 18s wait left `cameraClock`
   anywhere from 240 to 1000 (out of a required 1000) depending on the
   shot, meaning several screenshots were taken mid-transition, at
   different completion points between the two files.
3. **Final, working version**: polls the live `cameraClock` value in
   the page every 250 ms (up to 100 s) and only screenshots once it
   reaches ≥999/1000 for *both* files on *every* shot. Confirmed in the
   actual run: all 12 shots (6 angles × 2 files) report
   `cameraClock` between 999.99 and 1000 — genuinely matched, completed
   camera state for every comparison pair below.

## 3. Browser comparison — setup

Puppeteer + headless Chrome, SwiftShader software WebGL, cache
disabled, served via the existing `serve.cjs` on port 8924,
`phase20-demo.html` harness (Phase 8 idle-gaze-fixed engine copy). The
on-page status panel was read for every shot and confirms the correct
file was loaded each time (`Avatar: ./avatar_v17.glb` /
`Avatar: ./avatar_v19_candidate.glb`), not inferred from the query
string. Script: `poc/mpfb-avatar-poc/phase45_full_comparison.cjs`
(read-only against both GLBs — never writes to either).

Five framings, applied identically to both files via `head.setView()`:

| # | Shot | View / camera opt |
|---|---|---|
| 1 | Front-facing full head + shoulders | `upper`, `{cameraDistance:-0.1, cameraY:0.42}` |
| 2 | Centre-part / hairline close-up | `head`, `{cameraDistance:-0.1, cameraY:0.56}` |
| 3a/3b | Left / right temple (3/4 turn) | `head`, `{cameraDistance:-0.3, cameraY:0.56, cameraRotateY:±0.6}` |
| 4 | Top/front hair coverage | `head`, `{cameraDistance:-0.35, cameraY:0.82, cameraRotateX:-0.35}` |
| 5 | Shoulder area (fleck defect) | `head`, `{cameraDistance:0.5, cameraY:0.3, cameraX:0.25}` — Phase 17's own established framing, reused for continuity |

All 12 screenshots (listed in §6) were personally viewed side by side,
pair by pair, before writing §4's table.

## 4. Objective comparison

| Criterion | `v17` | `v19_candidate` | Verdict |
|---|---|---|---|
| Hairline smoothness/naturalness | Visibly rough, mottled transition at the hair/forehead boundary, most obvious in shots #2 and #4 | Visibly smoother, cleaner blend at the identical boundary in the same shots | **v19 better** |
| Pale/white rough border visibility | Present and clearly visible (shots #1, #2, #4; present but subtler at the 3/4-turn angles #3a/#3b) | Reduced/largely absent in #2 and #4; the 3/4-turn shots show a smaller, harder-to-call difference | **v19 better**, most pronounced face-on |
| Centre-part appearance | Same part geometry (shared mesh) | Same part geometry | **No difference** — expected, not a geometry change |
| Hair coverage / scalp exposure | No visible gaps or scalp show-through in any of the 5 angles | Same | **No difference / no regression** |
| Hair volume & overall realism | v19_candidate's own history notes a conservative alpha-based hair-bulk thinning pass; no clearly visible volume difference was detectable across these 5 screenshots at this render resolution | — | **Inconclusive at this resolution** — real per Phase 39's own texture-level record, but not independently confirmable from these screenshots alone |
| Shoulder-fleck visibility | Clearly visible, both shoulders, shot #1 and #5 | Clearly visible, same positions, same apparent severity, shot #1 and #5 | **No difference — unresolved in both**, consistent with Phase 17's own finding that the fix was never integrated into any built GLB |
| Necktie | White tie, full length | Knot visibly recolored black (blade remains white) — a partial, texture-only recolor, not removal, per Phase 39/44's own documentation | **v19 different (intentional, documented), not a regression** |
| Any other regression | — | None observed: face, skin tone, suit color/shape, pose, and lighting are otherwise identical between the two | **None found** |

## 5. Conclusion

**v19_candidate is visually better and ready for the user's approval
decision.** The hairline improvement is real and visible at the two
framings that most directly target it (face-on close-up and the
top/front angle), consistent with Phase 38's documented fix (washing
out skin-texture stubble speckle). It is a smaller, harder-to-call
difference at the two 3/4-turn temple angles — reported honestly as
such rather than overstated. No regression was found anywhere else;
the one other difference (partial tie recolor) is a known, intentional,
previously-documented change, not an accidental side effect. The
shoulder-fleck defect remains equally present in both and is unrelated
to this comparison's scope.

This conclusion is about visual readiness only. Promotion itself
(renaming/replacing which file is "the baseline") is not performed by
this task and awaits the user's explicit approval.

## 6. New screenshots (all in `poc/mpfb-avatar-poc/`)

- `phase45_v17_front_full.png` / `phase45_v19_front_full.png`
- `phase45_v17_hairline_macro.png` / `phase45_v19_hairline_macro.png`
- `phase45_v17_temple_left.png` / `phase45_v19_temple_left.png`
- `phase45_v17_temple_right.png` / `phase45_v19_temple_right.png`
- `phase45_v17_top_front_coverage.png` / `phase45_v19_top_front_coverage.png`
- `phase45_v17_shoulder_fleck.png` / `phase45_v19_shoulder_fleck.png`

Script: `phase45_full_comparison.cjs` (final, working version — reads
both GLBs over HTTP, writes only PNGs, never touches a GLB).
Superseded diagnostic/attempt scripts kept for traceability:
`phase45_diag_rotate.cjs`, `phase45_diag_rotate2.cjs`,
`phase45_diag_rotate3.cjs`, `phase45_diag_rotated.png`,
`phase45_full_comparison_run2.log` (empty — an earlier backgrounding
attempt that was killed when its shell session ended, not a capture
result).

## 7. What was NOT touched

No GLB file, no TalkingHead engine copy (original or Phase 8 isolated
copy), no production code. Confirmed via fresh `git status --short`,
identical to every prior check in this investigation:

```
 M .gitignore
 M package-lock.json
 M src/TalkingAvatar.ts
 M src/renderer.ts
?? CLAUDE.md
?? avatars/female-loose-hair.glb
?? avatars/female-photo-skin-v2.glb
?? avatars/female-photo-skin.glb
?? demo/
?? poc/
?? reports/
?? research_notes/
?? test/gestures.test.ts
```

The only new content from this task is this report and the screenshots/
scripts listed in §6. `v17` and `v19_candidate` were **not promoted**;
no file was renamed or deleted.

**Stopping here, as instructed — awaiting explicit approval before any
promotion.**

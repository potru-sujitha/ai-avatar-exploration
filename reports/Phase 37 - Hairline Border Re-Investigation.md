# Phase 37 — Hairline Border Re-Investigation

## Lead finding: this is not a new defect — the user was looking at `avatar_v17.glb`, not the already-fixed `avatar_v18_candidate_v2.glb`

Rendered matched, identical-camera close-up hairline views of both files fresh,
in this pass, before assuming anything:

- `avatar_v17.glb` close-up (`phase37_v17_closeup.png`): **clearly shows the
  pale/beige border** at the hairline — the same defect described in the task
  and in Phases 30-32.
- `avatar_v18_candidate_v2.glb` close-up (`phase37_v18v2_closeup.png`), same
  camera settings: **no visible border** — hair blends smoothly into the
  forehead.
- `avatar_v18_candidate_v2.glb` top-elevated view (`phase37_v18v2_top.png`):
  hairline/center-part area also clean at this angle. (Note: this is an
  elevated angle, not a true straight-down overhead shot — this investigation
  has repeatedly been unable to get a genuine overhead angle in this headless
  Puppeteer setup across Phases 15, 26, 31, 33; that limitation persists here
  too and is disclosed rather than hidden.)

**Conclusion: Phase 33's masked blend-back fix is still intact and working.**
The border the user just saw is the known, already-fixed defect — they were
testing the baseline (`v17`), not the fixed candidate
(`v18_candidate_v2`), most likely because the coordinator's prior message
hadn't yet been acted on when this report was written, or the URL wasn't
re-visited with the `?avatar=` override.

## Recommendation

**Do not build a new candidate.** Redirect the user to:

```
http://localhost:8924/phase20-demo.html?avatar=./avatar_v18_candidate_v2.glb
```

This is the same file already independently verified clean in Phase 33 and
by the coordinator's own prior check. No new investigation, no new fix, and
no new candidate file were warranted or created in this pass.

## Preservation

No files were modified. `avatar_v17.glb`, `avatar_v12.glb`, `avatar_v16.glb`,
`avatar_v18_candidate.glb`, `avatar_v18_candidate_v2.glb`, the Phase 8
isolated engine's approved head-orientation fix, the original TalkingHead
engine, and all production code are all untouched. `git status --short`
before and after this pass shows only the new screenshots and this report —
identical to the long-standing session baseline otherwise.

## Files added

- `poc/mpfb-avatar-poc/phase37_compare_hairline.cjs`,
  `phase37_top_v18v2.cjs` — the two scripts used for this comparison.
- `reports/mpfb_avatar_poc_assets/phase37_v17_closeup.png`,
  `phase37_v18v2_closeup.png`, `phase37_v18v2_top.png`.
- This report.

# Phase 23 — External Realistic Long Hair Asset Research

**Outcome: no suitable candidate found among genuinely free, clearly-licensed
sources. No asset was downloaded or tested. `avatar_v12.glb` is untouched.**
Per the task's own explicit instruction ("If no suitable candidate is found,
stop and report the findings rather than forcing a poor asset into the
avatar"), this report stops at the research stage rather than forcing a
weak pick through Parts 3-4.

## 1. What was searched

Real web searches (not assumed from memory) across: Sketchfab (general and
CC0-oriented queries), OpenGameArt.org, RenderHub, CGTrader, Superhive
(Blender Market), Quaternius, and Poly Haven. Quaternius and Poly Haven
returned **no human hair assets at all** in these searches — both appear to
not carry this content, not just an oversight in query wording (Poly Haven
is exclusively environment/material/HDRI-focused in practice; Quaternius is
low-poly game-prop/character focused, not hair-specific).

## 2. Candidates found, with licensing evidence

| Candidate | Source | License (verified, not assumed) | Verdict |
|---|---|---|---|
| "Hair Female - 013" | Sketchfab (Scanlab Photogrammetry store listing) | Page itself only shows "Buy Royalty Free 3D model" — a paid commercial listing, not CC0/CC-BY. Fetched the actual page directly to confirm; no free/open license stated anywhere. | **Rejected** — not free, license category alone (paid royalty-free) differs from what the rest of this investigation has used |
| "European Female Base Mesh" | Sketchfab | Described as CC0 by its own uploader | **Rejected** — base body mesh only, has no hair at all |
| "Female Long Straight Hair Free" | RenderHub | No CC0/open license stated; "free" here means free-to-download on a marketplace, not an open license grant — RenderHub's own listings typically carry the site's standard non-commercial-unless-purchased terms | **Rejected** — license unclear/likely restrictive, exactly the "assume free download = usable" trap the task warns against |
| Female/long-hair "hair card" sets (CGTrader, Superhive) — several, e.g. "Female Hair - Classic Long Hair Cards," "Female Hair Cards Style 10 - Long Curly" | CGTrader / Superhive (Blender Market) | Explicitly "Royalty Free" **paid** licenses ($16-20), glTF/.glb export confirmed available on at least one listing | **Not rejected on quality — rejected on cost/category.** These are the only candidates found with genuinely realistic strand-card detail, real-time-ready geometry, and confirmed GLB export. But they cost real money and use a different license category (commercial royalty-free, not CC0) than every asset this 23-phase investigation has used so far. Purchasing one is a real financial decision, not a technical one — flagged separately below, not silently treated as equivalent to a free asset. |
| "Short punk hairstyle for female model" / "Ponytail hairstyle for female model" | OpenGameArt.org | Confirmed **CC0** by the listing itself | **Rejected on quality** — the ponytail is ~867 triangles, explicitly unwrapped with no texture, and its own author states "I went a bit overboard with the detail" (meaning even that is considered high for this style); the punk style is ~374 triangles, also untextured. Both are far cruder than MPFB's own already-rejected `Long01`/`o4saken_long01`/`faydaen_hair_1` — using either would be a visual regression, not an improvement, against this investigation's own established bar. |
| "OverScore Proxy" modular low-poly female character set | OpenGameArt.org | Confirmed **CC0**, bundles 315 pieces including several hairstyles (curtain bangs, double buns, long wavy hair named among the set) | **Rejected on quality, by its own naming** — the asset is explicitly titled and described as a "low-poly" character creation set. Could not fetch the page directly (returned HTTP 403), but OpenGameArt's own listing text (captured via search) confirms the low-poly framing is the author's own description, not a guess. A set built for stylized, modular low-poly characters is very unlikely to carry the "fine, layered, individual strand definition" the target appearance calls for — the entire category is mismatched to the goal, not just a detail to verify after downloading. |
| Ready Player Me hairstyle assets | readyplayer.me developer docs | Documented as GLB-only custom assets built specifically for RPM's own avatar body topology and recoloring pipeline (hair ships with no baked color map, colored by RPM's own runtime system) | **Rejected** — not a general-purpose downloadable asset at all; it's a platform-specific authoring format tied to Ready Player Me's own avatar body, not transferable to an MPFB head/scalp without redoing the entire rig assumption RPM's own docs describe |

## 3. The real finding

There is a genuine split in what's actually available, not a failure to
search hard enough:

- **Free, clearly CC0-licensed hair models exist**, but every one found is
  a crude, untextured, low-triangle placeholder mesh — by the *authors'
  own description*, not an outside judgment. None would plausibly look
  better than what Phases 15/21/22 already tried and rejected from MPFB's
  own catalog.
- **Realistic, strand-card-detailed, real-time-ready, GLB-exportable hair
  models exist** — but every one found is a **paid** commercial product
  ($16-20 range) under a "Royalty Free" license, a different category from
  every asset used in this investigation so far (all MPFB/MakeHuman-sourced
  CC0 assets, confirmed per-asset throughout Phases 1-22).

No candidate satisfies both "genuinely free/CC0" and "realistic enough to
be worth testing" simultaneously among the sources checked.

## 4. Parts 2-4 — not performed, and why

Per the task's own explicit permission to stop rather than force a poor
asset in: no candidate was downloaded, no technical compatibility test was
run against MPFB's scalp/rig, and no browser verification was performed.
Testing one of the free CC0 options would predictably reproduce or worsen
the exact problems already documented in Phases 15/21/22 (chunky, blocky,
helmet-like, or now additionally untextured/flat); that outcome doesn't
need to be re-demonstrated to be credible, given the authors' own
descriptions already establish it.

## 5. Recommendation

Two real paths forward, not one:

1. **Accept this as the ceiling of the free-asset approach.** Every
   reasonably findable CC0 hair option — MPFB's own catalog (Phases
   15/21/22) and now the broader open web (this phase) — has been checked
   and found wanting. Continuing to search for a free, realistic,
   commercially-clean hair asset is unlikely to succeed; this is a real
   market gap, not a search-effort problem.
2. **Consider a paid commercial-license hair-card asset** (the CGTrader/
   Superhive options identified above, $16-20, confirmed GLB export on at
   least one listing). This is a genuine option but a different kind of
   decision than anything else in this investigation — it costs real
   money and introduces a non-CC0 license into an otherwise all-CC0 asset
   stack. **This requires the user's explicit decision, not a default
   assumption that spending money is in scope.**

## 6. Remaining risks (for either path, not yet evaluated further)

- Even a purchased hair-card asset's own scalp/rig assumptions have not
  been checked against MPFB's actual head geometry — Part 2's planned
  compatibility check never ran since no candidate advanced that far.
- Alpha-sorting artifacts (a known risk with card-based hair, flagged in
  the original task) remain unverified for any external candidate.
- No performance data exists for an external asset in this pipeline at
  all yet.

## Files

No new POC files were created (no asset was downloaded, so there was
nothing to build or test). This report is the only new file.
`avatar_v12.glb`, `avatar_v13.glb`, production code, and both TalkingHead
engine copies are untouched — confirmed via `git status --short`, identical
to the investigation's established baseline before and after this phase.

Waiting for the user's decision on which of the two paths in §5 to pursue
— no further action taken in this phase.

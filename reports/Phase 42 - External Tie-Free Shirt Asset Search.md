# Phase 42 — External Tie-Free Shirt Asset Search

**Result: no suitable asset found.** Two candidates had genuinely clean,
verified licensing but each fails on a separate, disqualifying ground
(style realism for one, structural/rig incompatibility for the other).
One reliable CC0 source was directly queried and confirmed to have zero
relevant assets. The rest of the field could not be verified to this
investigation's own required standard within this pass. Nothing was
downloaded, integrated, or modified — pure research, as instructed.

## Candidates investigated

### 1. OverScore Proxy — Modular Low-Poly Female Character Creation Set (OpenGameArt)

- **License, verified**: CC0 1.0 Universal, confirmed on the asset's own
  OpenGameArt page and cross-confirmed via a second source quoting the
  same license — genuinely free for any use including commercial, no
  attribution required.
- **Has named blouse pieces**: "Sweetheart Blouse," "V-Neck Blouse," and
  a "Striped Top," among 315 total clothing/accessory pieces in the set.
- **Disqualified on style, not license**: the asset's own title and tags
  explicitly describe it as **"low-poly"** — a stylized, game-asset
  aesthetic, not the realistic register this project's MPFB avatar is
  built in. The task's own requirement is "realistic professional
  corporate appearance"; a low-poly blouse mesh would read as a jarring
  style mismatch grafted onto a realistic face/body, not a believable
  professional shirt. **Rejected on fit, confirmed clean on license.**
- OpenGameArt's own pages return `403 Forbidden` to direct automated
  fetches (confirmed on two separate OGA URLs this pass) — the license
  and content findings above came from search-result text and a
  secondary source quoting the same license field, not a direct page
  read. Flagged as a verification-method limitation, not hidden.

### 2. Microsoft Rocketbox (GitHub, `microsoft/Microsoft-Rocketbox`)

- **License, verified directly from the repo**: "The library of avatars
  is now released under MIT License" — covers the full avatar library
  (code and assets together), confirmed via the repository's own page
  text, not a third-party claim. This is also, notably, the same license
  family already used by this project's actual production avatar format.
- **Structurally incompatible for this specific need**: inspected the
  repo's real file tree via the GitHub API — `Assets/Avatars/` contains
  only `Adults/`, `Children/`, `Professions/` directories with no visible
  standalone garment files; every avatar ships as a complete, pre-clothed
  character (confirmed by the repo's own import documentation, which
  refers to importing a full avatar folder with its FBX and textures
  together, not a separable clothing layer). Even a "Professions" avatar
  wearing business attire would mean extracting a shirt mesh out of
  someone else's fused character model — the same category of problem
  Phase 40 already fought unsuccessfully on the current suit.
- **A second, independent blocker**, already established earlier in this
  investigation's own history (not re-derived here): Rocketbox avatars
  use a 3ds Max Biped skeleton, which is not Mixamo-compatible and would
  need Adobe Mixamo's web auto-rigger to retarget — on top of the
  extraction problem above, not instead of it. **Rejected — clean
  license, but two independent structural blockers.**

### 3. Poly Haven — directly queried, confirmed empty

Queried Poly Haven's own public API for its apparel/clothing model
category directly (`api.polyhaven.com/assets?type=models&categories=apparel`)
rather than relying on a search snippet — **the response is an empty
object**. Poly Haven genuinely has zero clothing/apparel 3D models in its
catalog right now. This matches a prior phase's finding that Poly Haven
also has no human hair assets — the site's actual focus is HDRIs,
materials, and simple props, not detailed character apparel. **Not a
candidate — confirmed, not assumed.**

### 4. GitHub, Blender Market/Superhive, Sketchfab, CGTrader, Quaternius — not individually verifiable in this pass

General searches surfaced many "free blouse/shirt" listings across these
sources (e.g. a Sketchfab "3D clothes" collection with a named blouse
model; various CGTrader/Superhive "free" tagged shirts), but **none could
be confirmed, from search results alone, to be simultaneously**: (a)
genuinely CC0/MIT/Apache-2.0 on the asset's own page rather than a
marketplace category filter (this investigation has already caught a
"CC0-filtered" Sketchfab search that actually returned a paid listing, in
the earlier MuseTalk research), (b) realistic rather than stylized, and
(c) a standalone shirt rather than part of a full paid outfit. Opening
and verifying each one individually was outside what this single research
pass could complete. Per this investigation's own standing rule — do not
recommend an asset whose license wasn't independently confirmed on its
own page — **none of these are recommended candidates**, not because they
were disproven, but because they weren't verified to the bar this project
requires.

## Compatibility notes (for whichever candidate, if any, is pursued later)

Any eventual candidate would need, regardless of source: realistic (not
stylized) proportions matching the existing MPFB female base mesh,
Blender import support, glTF/GLB export support, and — since no candidate
found this pass ships pre-weighted to this project's specific rig — a
re-weighting pass to the existing skeleton, the same kind of work this
project has already done for other assets (e.g. the hair color-correction
and alpha-mask techniques established across Phases 3-33).

## Recommendation

**No suitable asset exists, confirmed by direct investigation of the two
best license-clean candidates and a direct API query of a third source —
not by assumption.** This does not change the project's current best
state: `avatar_v19_candidate.glb` (tie present, recolored to blend with
the jacket, from Phase 39) remains the practical option unless a
hand-authored geometry patch (Phase 41's second proposed option, still
unattempted) is pursued instead of further asset search.

## Protected files

Nothing in this repository was read, opened, or modified during this
phase — only external web pages and APIs were queried. `git status
--short` in `C:/Users/sujitha/talking-avatar` is unchanged from the
session baseline; the only new file is this report. No download,
integration, or avatar modification was performed, per the task's
explicit instruction to wait for approval before any of those steps.

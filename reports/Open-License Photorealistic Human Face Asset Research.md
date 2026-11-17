# Open-License Photorealistic Human Face Asset Research

**Objective:** following the MuseTalk Face Asset Research rejection (its demo
faces are non-commercial-only and include identifiable real people with no
consent), investigate alternative sources of a **photorealistic, non-cartoon,
professional female** face/avatar asset that satisfies all of: genuinely
open license, clear commercial-use permission, documented consent or
synthetic-human provenance. Research only — no files modified in this repo.

## 1. Summary verdict

**No single source cleanly satisfies all four criteria at once for free.**
Every candidate trades off at least one: either it's free but non-commercial,
or commercial but paid/proprietary, or photorealistic but provenance-murky,
or cleanly licensed but not fully photoreal. The two genuinely safe paths
forward are (a) keep extending the Microsoft Rocketbox avatar already
integrated in this repo (MIT, free, no new consent question), or (b) if
true photographic realism is required, commission a real model's photo
under an explicit release that names AI/synthetic-animation use, then run
it through a paid commercial photo-to-avatar service. Both are detailed in
§6.

## 2. Candidates investigated

### 2a. Microsoft Rocketbox (already integrated in this repo — `src/`, `avatars/`)

- License: MIT, confirmed directly on the official `microsoft/Microsoft-Rocketbox`
  GitHub repo (relicensed from research-only to MIT in a November 2020
  update) — unrestricted commercial use.
- Appearance: Microsoft Research's own description confirms the library
  includes professionally-dressed female and male avatars (115 characters
  total, "fully rigged... high definition"). This is CG-realistic human
  character work, not photographic realism and not cartoon/stylized —
  already the project's own stated reason for choosing it.
- Consent/provenance: not separately documented in the public repo (no
  model-release statement found), but Microsoft's own act of relicensing
  the whole library to MIT implies internal rights clearance for
  unrestricted reuse — the strongest "institutional" consent signal found
  in this entire research pass, even without a named release document.
- **This is the only candidate in this report that is simultaneously free,
  unambiguously open-licensed, already verified, and already shipping in
  this project.**

### 2b. AI-generated ("person does not exist") synthetic faces — Generated Photos / icons8 100K-faces set

- Appearance: genuinely synthetic — no single real person is depicted, which
  directly solves the likeness/right-of-publicity problem that disqualified
  MuseTalk's demo assets.
- License: the well-known free "100,000 faces" set is **CC BY-NC-SA 4.0 —
  non-commercial, share-alike** (confirmed via The Decoder/icons8 coverage of
  the original release). Commercial use requires a paid API/bulk-download
  plan from Generated Photos directly — pricing reported inconsistently
  across sources ($8.97/image one-time, or ~$17–20/month subscription
  tiers) and not independently confirmed against the vendor's current terms.
- **Provenance gap**: this entire category (Generated Photos, "This Person
  Does Not Exist," and other StyleGAN-family generators) is built on
  NVIDIA's FFHQ dataset or similar Flickr-scraped corpora. FFHQ is itself
  the subject of a well-documented consent controversy: images were pulled
  from Flickr accounts under their photos' Creative Commons licenses, but
  critics (exposing.ai, Fortune, and academic sources) argue the *people
  photographed* never separately consented to their faces being used to
  train face-generation models, and over 10% of the dataset's source photos
  have since been deleted or made private on Flickr while persisting in the
  distributed dataset. No single generated output matches a real person's
  face, but the training-data provenance chain underneath this entire
  category is contested, not clean.
- Verdict: commercially usable only via a paid plan (not "open license"),
  and the "documented consent" criterion is unresolved at the training-data
  level even though no identifiable individual appears in any single output.
  Flagged as a gap, not a recommendation either way.

### 2c. Ready Player Me

- License: default web-created avatars are **CC BY-NC-SA 4.0 — non-commercial**
  (confirmed directly from Ready Player Me's own docs). Commercial use
  requires joining their developer/partner program, which is free to
  register but is a permission grant, not an open license.
- Realism: stylized-realistic, not full photoreal; no specific "professional
  business female" preset with its own license terms was found.
- **Unverified but notable risk**: one competitor's marketing page claims
  Ready Player Me shut down its avatar platform on 2026-01-31 following a
  Netflix acquisition. This is a single vendor source, not confirmed by
  Ready Player Me's own docs in this search pass — must be verified directly
  before relying on RPM for anything going forward.

### 2d. Avatar SDK / MetaPerson Creator

- License: proprietary commercial product. Selfie-to-avatar generation,
  GLB/glTF/FBX export confirmed. On-premise/local-compute deployment exists
  but is gated to an Enterprise paid plan; exact pricing/terms not
  independently confirmed.
- This does **not** supply a face — it converts a photo *you already have
  the rights to* into a 3D avatar. It only solves the "photorealistic + GLB
  export" requirement; the underlying photo's consent/license is still your
  responsibility to source separately (see §6b).

### 2e. Renderpeople (3D-scanned real humans, commercial asset store)

- Real humans, photogrammetry-scanned, sold as a commercial 3D-asset
  product. Renderpeople's own page states at least one "Posed People"
  scan is free for commercial use; paid catalog items list GLB among
  supported export formats (alongside Unreal/Unity/Blender/FBX/OBJ).
- Posed/static scans are built for still scenes, not facial-rig-driven lip
  sync — rigged/animated product lines exist separately and would need to
  be checked per-product for facial blend shapes (ARKit/Oculus visemes were
  not confirmed present on any specific Renderpeople product in this pass).
- Consent: as a commercial scan vendor selling real people's likenesses as a
  product, Renderpeople's business model implies model releases are
  handled on their end, but this was not independently confirmed from a
  published release statement — flagged as a gap, not a confirmed clean
  source.

### 2f. Daz3D (Genesis base figures)

- Licensing is confirmed **murky and inconsistent even among Daz's own
  community/forum answers**: renders/animations from Daz content are
  generally fine commercially, but exporting the actual mesh into another
  engine (e.g., as glTF for this project's Three.js renderer) is described
  by multiple forum sources as requiring a separate, paid **Interactive
  License / Game Developer License**, with some users arguing plain export
  already breaches the base EULA as unauthorized redistribution. No
  glTF-specific rule was found either way. **Not recommended without
  purchasing and independently re-reading the current Interactive License
  text** — the standard content license alone does not clear this use case.

## 3. Cross-cutting finding: this project's own prior photo-reskin work has an undocumented-provenance gap

Checked `work/photo-reskin/sample_photo.cjs`: the reference photo used for
that earlier skin-tone/hair-tone re-texturing experiment is loaded from
`C:\Users\Admin\AppData\Local\Temp\claude\...\images\1.png` — a prior
session's scratchpad path. **No filename, comment, README, or JSON in
`work/photo-reskin/` records where that photo came from, under what license,
or whether its subject consented to any use**, let alone AI-driven reuse.
This is exactly the category of risk this report was asked to investigate
and avoid going forward — it should be resolved (document the source and
license, or discard the derived textures) before any output built from it
ships in a commercial product, independent of everything else in this
report.

## 4. Pattern consistent with this project's prior asset rejections

This is the third time in this project's documented history that a
permissive-looking top-level license did not cover the actual asset needed
(Phase 16's rejected AGPLv3 skin asset, Phase 22's rejected AGPLv3 hair
assets, and now MuseTalk's non-commercial-only demo faces). The same
pattern recurs here: Ready Player Me and Generated Photos' well-known free
tiers are both non-commercial by default; Daz3D's base license doesn't
cover engine export; only Microsoft Rocketbox and (for a real, commissioned
photo) a paid photo-to-avatar service cleanly avoid this trap.

## 5. Cross-reference table

| Candidate | Commercial use | Photoreal (not cartoon) | Consent/provenance | Cost |
|---|---|---|---|---|
| Microsoft Rocketbox (already in use) | ✅ MIT, unrestricted | Partial — CG-realistic, not photographic | Implied by Microsoft's own MIT relicense; no explicit release doc | Free |
| Generated Photos / 100K-faces | ❌ free tier is CC BY-NC-SA; ✅ only via paid plan | ✅ synthetic photoreal | ⚠️ no real person depicted, but FFHQ-style training data has a documented consent controversy | Paid for commercial |
| Ready Player Me | ❌ free tier is CC BY-NC-SA; partner program required for commercial | Stylized-realistic, not full photoreal | Platform status itself unverified (possible 2026-01-31 shutdown, unconfirmed) | Free w/ approval, or unusable |
| Avatar SDK / MetaPerson Creator | ✅ paid commercial product | ✅ (from your own supplied photo) | Depends entirely on the photo you supply — not solved by this tool | Paid, Enterprise for on-premise |
| Renderpeople | ✅ per-product commercial license (one free item confirmed) | ✅ real photogrammetry scans | Plausible via vendor's own release process, not independently confirmed | Paid (mostly) |
| Daz3D Genesis | ⚠️ base EULA likely insufficient for engine export; needs Interactive/Game Dev License | ✅ with Headshot-style add-ons | N/A (base mesh, not a real scanned individual) | Paid, extra license tier required |

## 6. Recommended paths

**Path A — stay with Microsoft Rocketbox (lowest risk, already shipping).**
Continue this project's existing photorealism-improvement work (the many
`Phase N` reports already in this directory) on top of the Rocketbox female
avatar already bundled in `avatars/` and `src/`. It's the only candidate
here that is simultaneously free, genuinely open-licensed, already
integrated, and carries no new consent question.

**Path B — if true photographic realism is a hard requirement:**
commission or license a real model's photo under a release that explicitly
names AI-driven/synthetic-media animation as a permitted use (a standard
stock-photo license is not sufficient for this — those licenses typically
exclude deepfake/avatar-driving use even when "commercial use" is checked),
then run that photo through a paid commercial photo-to-avatar pipeline
(Avatar SDK/MetaPerson Enterprise, or a commercial-tier Avaturn account) to
produce the GLB. This is the only path in this report that cleanly clears
**all four** criteria for a specific photorealistic human face, at the cost
of being commissioned/paid work rather than a free found asset.

**Not recommended without further action:** Ready Player Me (unverified
platform status), Daz3D (license ambiguity around engine export),
Generated Photos/StyleGAN-style generators (commercial tier is paid, and
the underlying training-data consent question is genuinely contested, not
resolved).

## 7. Gaps

- Generated Photos' current (2026) license text was not independently
  fetched — reporting is from third-party coverage of the 2019/2022
  releases; verify directly on generated.photos before any decision.
- Renderpeople's facial-rig/blend-shape support (ARKit/Oculus visemes) was
  not confirmed for any specific product — would need checking a product
  page directly if this path is pursued.
- Daz3D's current EULA and Interactive License text were not independently
  fetched — all findings here are from forum/community interpretation,
  explicitly flagged as such by the search results themselves.
- Ready Player Me's claimed 2026-01-31 shutdown is a single, unverified
  competitor claim — confirm directly before ruling RPM in or out.

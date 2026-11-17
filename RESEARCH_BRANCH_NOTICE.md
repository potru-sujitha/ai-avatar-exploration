# A Small Research to Create AI Avatar

This branch archives the `@interviewflowai/talking-avatar` project as reference
material: a real-time, client-side lip-sync SDK for 3D avatars, plus an
extensive proof-of-concept (`poc/`) exploring an MPFB/Blender-based avatar
generation pipeline and a vendored copy of the third-party `TalkingHead`/
`HeadAudio` JS engines (met4citizen, MIT) used to prototype blink/gaze/head-sway/
mood behavior. See `CLAUDE.md` for the architecture overview and `reports/` for
the full phase-by-phase investigation log.

This content is intentionally on its own branch, disconnected from this
repo's main history — it does not touch or depend on any other code here.

## Files intentionally excluded from this branch

A security/licensing audit was run before this push. The following were left
out (originals are preserved in the author's local working copy, not deleted):

**Undocumented photo provenance (privacy)** — these derive from a photo with
no recorded source, license, or consent on file, so they were not published:
- `avatars/female-photo-skin.glb`, `avatars/female-photo-skin-v2.glb`, `avatars/female-loose-hair.glb`
- `poc/mpfb-avatar-poc/phase18_reference_crop.png` and its visual derivatives
  (`phase18_controlled_v10.png`, `phase18_controlled_v11.png`,
  `phase18_v10_baseline.png`, `phase18_v10_closeup.png`,
  `phase18_v11_neutral.png`, `phase18_eye_closeup.png`,
  `reports/mpfb_avatar_poc_assets/phase16_v10_vs_reference.png`,
  `reports/mpfb_avatar_poc_assets/phase18_v11_vs_reference.png`)
- `work/` (the source experiment directory for the above) in full

**Exceeds GitHub's 100MB per-file limit** (CC0-licensed otherwise, confirmed
via the MakeHuman community asset pages, but too large to push):
- `poc/mpfb-avatar-poc/assetpacks/system_assets.zip` (280MB)
- `poc/mpfb-avatar-poc/assetpacks/hair01.zip` (227MB)
- `poc/mpfb-avatar-poc/assetpacks/skins01.zip` (104MB)

**Unresolved licensing** (no explicit license statement found):
- `poc/mpfb-avatar-poc/assetpacks/visemes02.zip`
- `poc/mpfb-avatar-poc/assetpacks/faceunits01.zip`

Everything else — including `poc/talkinghead-poc/TalkingHead` and `HeadAudio`
(MIT, met4citizen) with their nested `.git` folders stripped so they commit as
plain files — is included as-is.

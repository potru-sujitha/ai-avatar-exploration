# MuseTalk Face Asset Research

**Objective:** determine whether the human face/image assets bundled in the
MuseTalk GitHub repository (not its lip-sync pipeline, models, or rendering
code) can be reused as a visual source for this project's AI interviewer
avatar. Research only — no files modified in this repo.

## 1. Repository confirmed

`https://github.com/TMElyralab/MuseTalk` — organization TMElyralab,
confirmed directly.

## 2. Assets found

The repo ships a `assets/demo/` directory containing multiple
sample face images/videos used to showcase the lip-sync pipeline's output:

| Directory | Files |
|---|---|
| `assets/demo/musk/` | `musk.png`, `musk_musev.mp4`, `musk_musetalk.mp4` |
| `assets/demo/yongen/` | `yongen.jpeg`, `yongen_musev.mp4`, `yongen_musetalk.mp4` |
| `assets/demo/sit/` | `sit.jpeg`, `sit_musev.mp4`, `sit_musetalkmp4.mp4` |
| `assets/demo/man/` | `man.png`, `man_musev.mp4`, `man_musetalk.mp4` |
| `assets/demo/monalisa/` | `monalisa.png`, `monalisa_musev.mp4`, `monalisa_musetalk.mp4` |
| `assets/demo/sun1/`, `assets/demo/sun2/` | `sun.png`, `sun_musev.mp4`, `sun_musetalk.mp4` |

`assets/figs/` contains Gradio UI screenshots, not independent face assets.

## 3. License governing these specific assets — separate from the code license, and far more restrictive

The repo's own README "Disclaimer/License" section draws an explicit,
three-way distinction — confirming this investigation's standing pattern
(already hit twice: Phase 16's rejected AGPLv3 skin asset, Phase 22's
rejected AGPL3 hair assets) that a permissive code license does **not**
automatically cover bundled demo/data assets:

- **Code**: "The code of MuseTalk is released under the MIT License...
  There is no limitation for both academic and commercial usage."
- **Trained model weights**: "The trained model are available for any
  purpose, even commercially."
- **Test/demo data — the actual assets in question**: **"The testdata are
  collected from internet, which are available for non-commercial research
  purposes only."**

The `assets/demo/*` face images and videos are exactly this test/demo
data. **They are explicitly licensed for non-commercial research use
only** — not commercial use, regardless of the MIT code license
surrounding them.

## 4. Likeness/identifiable-person concern — separate from and in addition to the copyright problem

This is a second, independent blocker, not just a licensing technicality:

- The demo filename `musk` strongly suggests Elon Musk, a globally
  recognizable public figure — not confirmed by name on the page, but the
  filename and the genre (talking-head lip-sync demos frequently use
  well-known faces to show off realism) make this a real risk, not a
  remote one.
- `monalisa` uses the Mona Lisa painting — a depiction of a real historical
  person (Lisa Gherardini), raising its own separate cultural/likeness
  questions distinct from copyright.
- The repo's own `BBOX_SHIFT.md` documentation explicitly names a real
  individual ("Xinying Sun") in a technical example — confirming the
  dataset does include identifiable named individuals, not just stock
  model photography.
- The README states test data was "collected from internet" — with no
  statement anywhere about consent from the people depicted.

**Using a real, identifiable person's face — especially a recognizable
public figure — as the visual identity of a commercial "AI interviewer"
product is a serious legal and reputational risk independent of
copyright.** Right-of-publicity/personality-rights law in most
jurisdictions requires the depicted person's consent for commercial use of
their likeness, and this is compounded here by the synthetic-media/deepfake
context (a real person's face being puppeted by an AI system for a
commercial product is exactly the kind of use right-of-publicity and
anti-deepfake laws are increasingly targeting). This concern would apply
even if the copyright license were fully commercial-clean, which it is not.

## 5. Verdict: NOT USABLE

Both independent blockers are dispositive on their own:

1. **Copyright**: the demo face assets are explicitly "non-commercial
   research purposes only" — disqualifying for a commercial product,
   consistent with every other asset-licensing rejection in this
   investigation.
2. **Likeness/publicity rights**: the assets include real, identifiable
   people, including a likely-recognizable public figure and an explicitly
   named individual, with no stated consent for any use, let alone
   commercial AI-driven reuse of their face.

No extraction/integration recommendation follows, since no clean asset
exists to integrate. Per this investigation's standing discipline
(Phase 16, Phase 22), this is rejected outright rather than forced in.

## 6. Scope note

MuseTalk's trained model weights are separately licensed for commercial
use, but this was explicitly out of scope per the user's instruction not
to adopt MuseTalk's pipeline/models — noted for completeness only, not
evaluated further.

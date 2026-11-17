# Open-Source Single-Photo Gaussian Splatting / NeRF Head-Avatar Projects (Splat-to-Mesh / Blendshape Feasibility)

## Overview / Cross-Cutting Finding

### Takeaway
Across every project surveyed, there is a hard split: projects that are truly single-photo at inference are Gaussian-splat-only with NO official mesh/GLB export or blendshape rig (expression is driven by FLAME/latent codes, not ARKit/Oculus morph targets); projects that DO ship a mesh-extraction script (LGM, TriplaneGaussian) are general-object 3D generators, not head-specialized, trained on Objaverse synthetic data, and still require an extra, unofficial/community conversion step (nvdiffrast marching-cubes, or a third-party PLY→GLB tool) to reach GLB. Several widely-cited "avatar" Gaussian Splatting papers (GaussianAvatars, SplattingAvatar, FlashAvatar) require monocular/multi-view VIDEO, not a single photo, despite being casually described as "photo-to-avatar" in some secondary sources — this is a critical distinction for the user's single-photo requirement.

### Cited Findings
- GaussianAvatars, SplattingAvatar, and FlashAvatar all require a video (multi-view or monocular) for fitting/training, not a single still photo — [GaussianAvatars repo](https://github.com/ShenhanQian/GaussianAvatars); [SplattingAvatar paper](https://arxiv.org/pdf/2403.05087.pdf); [FlashAvatar code](https://gh.r-mj.com/USTC3DV/FlashAvatar-code)
- GAGAvatar and Portrait4D/Portrait4D-v2 are genuinely feed-forward, one-shot/single-image methods at inference — [GAGAvatar repo](https://github.com/xg-chu/GAGAvatar); [Portrait-4D repo](https://github.com/YuDeng/Portrait-4D)
- None of the head-specialized single-image projects (GAGAvatar, Portrait4D-v2, HeadNeRF, PanoHead) document an official mesh/GLB export path or a blendshape/morph-target rig
- General-object single-image-to-3DGS projects (LGM, TriplaneGaussian) DO ship/point to mesh-extraction tooling (marching-cubes via nvdiffrast, or community PLY→GLB converters), but are not head/face specialized and carry no facial rig at all

### Inferences
- For this user's stated goal (GLB + ARKit/Oculus blendshapes from one photo), none of the Gaussian-Splatting/NeRF candidates found offer a low-effort path; all would require building a custom splat/NeRF→mesh→rig pipeline from scratch (e.g., marching cubes or Poisson surface reconstruction on a point cloud extracted from Gaussian centers, followed by manual or ML-based retopology and then wrapping to a FLAME-to-ARKit blendshape mapping).
- FLAME parameter output (seen in GAGAvatar, Portrait4D, Portrait-4D's GenHead, GaussianAvatars' `--bind_to_mesh`) is the most plausible bridge to classic blendshapes, since existing community tools (e.g., FLAME-to-ARKit blendshape mapping scripts used by NeRF/mesh researchers) can map FLAME expression/pose parameters onto an ARKit-compatible mesh — but this still requires the project to output or expose a FLAME-topology mesh, which most of these repos do only as an intermediate driving signal, not as a deliverable export.

### Gaps
- No confirmed example of anyone publicly shipping a complete "single photo → Gaussian splat avatar → GLB + ARKit blendshapes" pipeline using any of these repos end-to-end.

---

## Candidate: GAGAvatar (Generalizable and Animatable Gaussian Head Avatar)

### Takeaway
GAGAvatar is a genuine one-shot, single-photo-at-inference method (NeurIPS 2024) that outputs 3D Gaussian Splats directly from one image in a single forward pass, but it provides no mesh/GLB export and no blendshape rig — expression is driven via FLAME-derived codes (`expcode`, `posecode`, `shapecode`, `eyecode`) from a separate tracker, not morph targets.

### Cited Findings
- Repo: [github.com/xg-chu/GAGAvatar](https://github.com/xg-chu/GAGAvatar) (mirror: [github.com/mrnerf/gagavatar](https://github.com/mrnerf/gagavatar)), NeurIPS 2024, by Xuangeng Chu and Tatsuya Harada (University of Tokyo / RIKEN AIP) — [GAGAvatar repo](https://github.com/xg-chu/GAGAvatar)
- "Reconstructs controllable 3D head avatars from single images" — generates 3D Gaussian parameters from a single image in one forward pass — [GAGAvatar repo](https://github.com/xg-chu/GAGAvatar); [arXiv 2410.07971](https://arxiv.org/html/2410.07971v1)
- Inference CLI takes a single source image (`-i ./demos/examples/1.jpg`); the driver (`-d`) can be an image, tracked video, or image LMDB — [GAGAvatar repo](https://github.com/xg-chu/GAGAvatar)
- Output is 3D Gaussian Splatting with 32-dim per-Gaussian features via a modified rasterizer; no mesh or GLB export tooling is mentioned in the README — [GAGAvatar repo](https://github.com/xg-chu/GAGAvatar)
- Expression driven by a FLAME-based face tracker (built on FLAME, StyleMatte, EMICA, VGGHead); tracker outputs `expcode`/`posecode`/`shapecode`/`eyecode`, not blendshapes/morph targets — [GAGAvatar repo](https://github.com/xg-chu/GAGAvatar)
- License: repo lists a `LICENSE` file labeled "MIT license" on GitHub's sidebar, but full text not confirmed from the fetched page — [GAGAvatar repo](https://github.com/xg-chu/GAGAvatar)
- FLAME, EMICA, and VGGHead model/tracker assets are not auto-downloaded because they "have separate setup or license requirements" — their individual licenses were not confirmed — [GAGAvatar repo](https://github.com/xg-chu/GAGAvatar)
- No GPU/VRAM figures or training-time figures found in the README excerpt fetched; claims "real-time" reenactment via a `speed_test()` function — [GAGAvatar repo](https://github.com/xg-chu/GAGAvatar)
- Maintenance: 40 commits, 9 open issues, 1 open PR visible; no explicit last-commit date confirmed — [GAGAvatar repo](https://github.com/xg-chu/GAGAvatar)

### Inferences
- Because expression is parameterized via FLAME-style codes (through the EMICA/VGGHead tracker) rather than baked into opaque gaussian features alone, there is at least a theoretical bridge: one could drive a separately-rigged FLAME mesh with the same `expcode`/`posecode` and map FLAME blendshapes to ARKit/Oculus visemes — but this does NOT give you the GAGAvatar-rendered appearance as a mesh; it only gives you a FLAME-topology stand-in mesh animated in sync.
- Converting the actual Gaussian splat output to a textured mesh usable in three.js would require an independent splat→mesh step (not provided by this repo) such as Poisson reconstruction on Gaussian centers/normals, which is nontrivial given gaussians are not generally surface-aligned.

### Gaps
- Exact LICENSE text (MIT confirmed only via GitHub sidebar label, not full text), licenses for bundled FLAME/EMICA/VGGHead assets, GPU/VRAM requirements, and training/inference timing were not confirmed from available sources — would require reading the raw LICENSE file and docs directly.
- No commercial-use statement found either way.

---

## Candidate: GaussianAvatars (Photorealistic Head Avatars with Rigged 3D Gaussians)

### Takeaway
GaussianAvatars requires a multi-view VIDEO recording of a head (not a single photo) and is explicitly research-only (CC-BY-NC-SA-4.0 plus a Toyota Motor Europe non-commercial clause); it does rig Gaussians to a FLAME mesh (a real bridge to blendshapes) but fails the single-photo requirement outright.

### Cited Findings
- Repo: [github.com/ShenhanQian/GaussianAvatars](https://github.com/ShenhanQian/GaussianAvatars), CVPR 2024 — [arXiv 2312.02069](https://arxiv.org/pdf/2312.02069v1)
- Paper states input is "a multi-view video recording of a human head"; using one's own video data requires preprocessing through the separate VHAP head-tracking pipeline — [arXiv 2312.02069](https://arxiv.org/pdf/2312.02069v1); [GaussianAvatars repo](https://github.com/ShenhanQian/GaussianAvatars)
- Gaussians are explicitly "rigged" — bound to a driving FLAME mesh via a `--bind_to_mesh` flag, with a `flame_model` folder in the repo; expressions driven by motion `.npz` files, not blendshapes/morph targets directly — [GaussianAvatars repo](https://github.com/ShenhanQian/GaussianAvatars)
- Output saved as Gaussian `.ply`; repo includes a `convert.py` and mesh-renderer code adapted from NVDiffRec/NVDiffRast for *viewing* meshes, but README does not describe exporting a textured mesh/GLB as a deliverable — [GaussianAvatars repo](https://github.com/ShenhanQian/GaussianAvatars)
- License: CC-BY-NC-SA-4.0 (LICENSE.md), plus the underlying Gaussian Splatting codebase's own separate research license (LICENSE_GS.md) requiring contact with Inria for commercial use; README also carries an explicit Toyota Motor Europe NV/SA non-commercial notice — [GaussianAvatars repo](https://github.com/ShenhanQian/GaussianAvatars)
- GPU/VRAM requirements and training time not confirmed from the fetched page — [GaussianAvatars repo](https://github.com/ShenhanQian/GaussianAvatars)
- Maintenance: 321 commits, 28 open issues, 1.1k stars, 149 forks visible; exact last-commit date not confirmed — [GaussianAvatars repo](https://github.com/ShenhanQian/GaussianAvatars)

### Inferences
- The FLAME-binding mechanism is the strongest "bridge to blendshapes" seen in this whole survey, since the underlying driving mesh is FLAME, for which community FLAME→ARKit blendshape mappings exist — but the Gaussians themselves are still not a textured mesh; only the driving FLAME mesh is a mesh, and the photorealistic Gaussian appearance would be lost if you discarded the Gaussians in favor of the bare FLAME mesh.
- Commercial use is explicitly blocked by two separate non-commercial clauses (project + upstream Gaussian Splatting), making this unusable for any commercial product without a licensing deal with Inria/MPII and Toyota Motor Europe.

### Gaps
- Hard disqualifier regardless of mesh/blendshape feasibility: requires multi-view video capture, not a single photograph, so it does not meet the user's input constraint.
- GPU/VRAM and training-time figures not found.

---

## Candidate: SplattingAvatar

### Takeaway
SplattingAvatar is monocular-VIDEO-based (not single-photo), real-time (300+ FPS on RTX 3090), and the search found no GLB/mesh export or blendshape documentation — disqualified primarily on the input-type requirement.

### Cited Findings
- Paper takes "monocular videos as input" with a trainable embedding for Gaussian-Mesh association — [arXiv 2403.05087](https://arxiv.org/pdf/2403.05087.pdf)
- Code repo stated as [github.com/initialneil/SplattingAvatar](https://github.com/initialneil/SplattingAvatar) (not independently fetched/verified in this research pass)
- Reports 300+ FPS on an RTX 3090 and 30 FPS on an iPhone 13 — [arXiv 2403.05087](https://arxiv.org/pdf/2403.05087.pdf)
- A related but distinct project, GSAC (VU-RASL/GSAC), builds Gaussian splatting avatars from a single phone-recorded rotating video (not a single still photo either) — [GSAC repo](https://github.com/michaelrubloff/GSAC)

### Inferences
- Because the Gaussian-Mesh association technique exists (Gaussians bound to a template mesh), a mesh-plus-blendshape bridge may be theoretically possible similar to GaussianAvatars' FLAME binding, but this was not confirmed from source in this pass.

### Gaps
- Did not independently fetch the official github.com/initialneil/SplattingAvatar README/LICENSE — license, mesh/GLB export, and blendshape support are unverified. Flagging as a gap rather than inventing an answer.
- Disqualified on input type (monocular video, not single photo) regardless.

---

## Candidate: FlashAvatar (High-fidelity Head Avatar with Efficient Gaussian Embedding)

### Takeaway
FlashAvatar trains from a short monocular VIDEO (minutes-long clip), has no single-image mode, and license terms could not be confirmed (README "License" heading returned with no visible text in the fetch).

### Cited Findings
- Official code: USTC3DV/FlashAvatar-code; README describes training on a monocular video and reconstructing an avatar from a "short monocular video sequence in minutes" — [FlashAvatar code](https://gh.r-mj.com/USTC3DV/FlashAvatar-code); [arXiv 2312.02214](https://arxiv.org/html/2312.02214v2)
- No single-image mode documented — [arXiv 2312.02214](https://arxiv.org/abs/2312.02214v2)
- Tested on an Nvidia RTX 3090; requires PyTorch3D — [FlashAvatar code](https://gh.r-mj.com/USTC3DV/FlashAvatar-code)
- License heading present in README but text not captured in search snippet — unverified — [FlashAvatar code](https://gh.r-mj.com/USTC3DV/FlashAvatar-code)

### Inferences
- None of significance beyond disqualification.

### Gaps
- Disqualified on input type (video, not single photo).
- License text, mesh/export tooling, and blendshape support not confirmed — would need a direct repo fetch to verify.

---

## Candidate: GaussianAvatars-adjacent / "Gaussian Head Avatar" search

### Takeaway
A literal repo named "Gaussian Head Avatar" was not found; closest matches surfaced were MVCHead (CC BY-NC 4.0, no multi-view data needed but still not confirmed single-photo) and GAGAvatar (covered above) — treating this as a non-finding rather than inventing a match.

### Cited Findings
- MVCHead (humansensinglab/MVCHead), CVPR 2026 candidate, trains without multi-view data using 2D images alone; license listed as CC BY-NC 4.0 (bars commercial use) — [MVCHead repo](https://github.com/humansensinglab/MVCHead)

### Inferences
- None drawn; insufficient data.

### Gaps
- Could not confirm MVCHead's exact single-photo-at-inference capability, output representation (splat vs mesh), or blendshape support — not independently fetched in this pass due to tool-call budget. Flag for a follow-up fetch if this candidate matters to the user.

---

## Candidate: Portrait4D / Portrait4D-v2

### Takeaway
Portrait4D-v2 is a one-shot (single source image) 4D head synthesizer, but it is fundamentally a triplane-based NeRF, not a mesh or Gaussian splat; it does include a marching-cubes shape-extraction flag, and FLAME parameters do drive its GenHead sibling model — but reenactment itself needs a separate driving video/source, not blendshapes, and no GLB export is documented. License is MIT per GitHub's sidebar label (text unconfirmed), and heavy pretrained-dependency licenses (FLAME, PD-FGC, ArcFace) are unverified.

### Cited Findings
- Repo: [github.com/YuDeng/Portrait-4D](https://github.com/YuDeng/Portrait-4D) — official PyTorch implementation of both Portrait4D (one-shot) and Portrait4D-v2 (ECCV 2024), by Yu Deng, Duomin Wang, Baoyuan Wang (Xiaobing.AI) — [Portrait-4D repo](https://github.com/YuDeng/Portrait-4D); [arXiv 2403.13570](https://arxiv.org/pdf/2403.13570)
- Method is feed-forward from "one source image"; a vision-transformer encoder-decoder predicts a triplane-based head NeRF from the source image — [Portrait-4D repo](https://github.com/YuDeng/Portrait-4D)
- Pretrained checkpoint "portrait4d-v2-vfhq512" is described as a "one-shot video-driven 4D head synthesizer" — reenactment requires both a source (`--srcdir`) and a target/driving folder (`--tardir`), implying a driving input (video or image) is needed to animate the avatar even though the identity comes from a single photo — [Portrait-4D repo](https://github.com/YuDeng/Portrait-4D)
- Mesh extraction exists: a documented command flag is annotated "Extract shapes via marching cubes" — but no GLB/glTF export or texture-baking step is mentioned — [Portrait-4D repo](https://github.com/YuDeng/Portrait-4D)
- FLAME controls shape/expression only for the GenHead model (a component), not confirmed as the direct driving mechanism for the main Portrait4D-v2 reenactment, which instead uses "PD-FGC motion embeddings" and "motion-aware cross-attentions" — [Portrait-4D repo](https://github.com/YuDeng/Portrait-4D); [arXiv 2403.13570](https://arxiv.org/pdf/2403.13570)
- License: file named `LICENSE`, GitHub sidebar labels it "MIT license"; full text not confirmed; no commercial-use statement found; dependency licenses (FLAME, PD-FGC, LPIPS, ArcFace) not stated on the page — [Portrait-4D repo](https://github.com/YuDeng/Portrait-4D)
- GPU/VRAM: inference needs a V100 with 32GB "is enough"; training recommends 8x A100 80GB (GenHead: at least 4x A100 40GB); Linux-only, CUDA 11.3+ — [Portrait-4D repo](https://github.com/YuDeng/Portrait-4D)
- Maintenance: only 20 commits total visible; 296 stars, 24 watchers, 17 forks, 17 issues; no Releases/Packages; exact last-commit date not confirmed — [Portrait-4D repo](https://github.com/YuDeng/Portrait-4D)

### Inferences
- Even though identity comes from a single photo, this is fundamentally a NeRF/triplane talking-head *reenactment* system driven by a second video/image, not a classic rigged-mesh pipeline; its marching-cubes shape export would yield an untextured or coarsely-textured geometric mesh at best, requiring significant additional work (UV unwrapping, texture baking, retopology) before any blendshape rigging could be attempted.
- 32GB+ VRAM for inference and 8x A100 for training make this one of the most hardware-demanding candidates in the set, likely impractical for most self-hosting scenarios.

### Gaps
- Exact driving mechanism for facial expression on the "v2" checkpoint (PD-FGC embeddings vs FLAME) not fully disambiguated from available sources.
- Commercial-use permissions and dependency-asset licenses (FLAME, PD-FGC, ArcFace, LPIPS) unverified.

---

## Candidate: PanoHead

### Takeaway
PanoHead's official repo supports single-RGB-image full-head reconstruction (`gen_pti_script.sh`) producing a tri-grid/NeRF-style volumetric representation with `.mrc` shape export (not a textured mesh and not GLB); the official repo gives no blendshape/FLAME rig; forks (not the official repo) add PLY mesh export via marching-cubes-style scripts. Explicitly described by its own authors as a "one-time code drop" / "research reference implementation" with no accepted outside PRs.

### Cited Findings
- Repo: [github.com/SizheAn/PanoHead](https://github.com/SizheAn/PanoHead), CVPR 2023 — [arXiv 2303.13071](https://ar5iv.labs.arxiv.org/html/2303.13071)
- README documents "Generate full head reconstruction from a single RGB image" via `./gen_pti_script.sh`, using folder (not zip) datasets, no segmentation files required — [PanoHead repo](https://github.com/SizheAn/PanoHead)
- Abstract describes a "tri-grid neural volume representation" (contrasted with tri-plane); outputs include images and `.mrc` shape files (`gen_samples.py --shapes=true`) — no mesh or GLB export in the official repo — [PanoHead repo](https://github.com/SizheAn/PanoHead)
- Community fork kylemcdonald/PanoHead adds a `gen_pti_script_with_mesh.sh` script producing a PLY mesh from a single RGB image (requires `plyfile`/`trimesh`); this is NOT part of the official repo — reported via secondary web search, not independently fetched — [search result, unverified via direct fetch]
- No blendshape, FLAME, or expression-parameter controls mentioned anywhere in the official README; documented controls are latent seeds, truncation, and camera pose/intrinsics (viewpoint only, not expression) — [PanoHead repo](https://github.com/SizheAn/PanoHead)
- License: a `LICENSES` folder exists (contents not shown); README carries a CC BY 4.0 badge; FFHQ-F training dataset is explicitly NOT released due to licensing restrictions; the project credits EG3D/StyleGAN3-derived CUDA extensions without stating their terms — [PanoHead repo](https://github.com/SizheAn/PanoHead)
- No explicit commercial-use statement found; repo self-describes as a "research reference implementation," outside PRs not accepted — [PanoHead repo](https://github.com/SizheAn/PanoHead)
- GPU: "1–8 high-end NVIDIA GPUs," tested on V100/RTX3090/A100, no VRAM figure given; Linux recommended, Python 3.8, PyTorch 1.11.0+, CUDA 11.3+ — [PanoHead repo](https://github.com/SizheAn/PanoHead)
- Maintenance: only 9 commits visible, 25 issues, 3 PRs, 2.0k stars, 233 forks; "one-time code drop" phrasing strongly suggests the project is not actively maintained — [PanoHead repo](https://github.com/SizheAn/PanoHead)

### Inferences
- PanoHead has NO facial-expression control mechanism at all (it is a static 360° head reconstruction/generation GAN, not an animatable avatar system), so even with a hypothetical mesh export it has no built-in pathway to drive ARKit/Oculus blendshapes — any animation rig would have to be built entirely from scratch on top of the exported geometry, with no FLAME or other parametric bridge provided.
- The `.mrc` volumetric shape format would need an external marching-cubes step (as the community fork does) to become any kind of mesh at all, and even then, it would be untextured/under-textured, high-poly, and un-rigged.

### Gaps
- Fork-provided mesh export (kylemcdonald/PanoHead) was not independently verified by direct fetch — flagged as reported-but-unconfirmed.
- Exact LICENSES folder terms not confirmed (only the CC BY 4.0 badge was visible).

---

## Candidate: HeadNeRF

### Takeaway
HeadNeRF supports single-image fitting into a parametric NeRF latent space (not a mesh, not Gaussian splats), with GPU needs of ~5GB (32-res model) to ~13GB (64-res model); explicitly licensed "Academic or non-profit organization noncommercial research use only" — a hard commercial-use blocker. No mesh/GLB export or blendshape rig.

### Cited Findings
- Repo: [github.com/CrisHY1995/headnerf](https://github.com/CrisHY1995/headnerf), CVPR 2022, "HeadNeRF: A Real-Time NeRF-Based Parametric Head Model" — [CVPR open-access page](https://openaccess.thecvf.com/content/CVPR2022/html/Hong_HeadNeRF_A_Real-Time_NeRF-Based_Parametric_Head_Model_CVPR_2022_paper.html); [arXiv 2112.05637](https://arxiv.org/pdf/2112.05637.pdf)
- Repo includes `FittingSingleImage.py`, described as "a fitting framework for obtaining the latent code embedding in HeadNeRF of a single image" — single photo input confirmed — [headnerf repo](https://github.com/CrisHY1995/headnerf)
- Uses neural radiance fields as the 3D proxy "instead of a textured mesh"; rendering time per frame reduced from 5s to 25ms — [arXiv 2112.05637](https://arxiv.org/pdf/2112.05637.pdf)
- GPU memory: ~5GB for the 32-resolution model, ~13GB for the 64-resolution model for single-image fitting — [headnerf repo](https://github.com/CrisHY1995/headnerf)
- License: explicitly "Academic or non-profit organization noncommercial research use only" — [headnerf repo](https://github.com/CrisHY1995/headnerf)
- Preprocessing requires a head mask, 68 facial landmarks, and a 3DMM parameter for initialization (note: this brushes against 3DMM territory, which is explicitly out of scope per the user's exclusion of DECA/3DDFA-style approaches, though HeadNeRF's core representation is NeRF, not a morphable mesh) — [headnerf repo](https://github.com/CrisHY1995/headnerf)

### Inferences
- By the paper's own framing, HeadNeRF is explicitly NOT a textured mesh representation — it is presented as an alternative to a mesh for speed reasons — meaning any mesh extraction would require a from-scratch NeRF-to-mesh conversion (e.g., marching cubes on the radiance field's density grid) that is not provided by the authors at all.
- The explicit non-commercial research-only license is an immediate, unambiguous commercial blocker regardless of technical feasibility.

### Gaps
- No last-commit-date/maintenance-activity figures were captured from the fetched page.
- No mesh-extraction script of any kind (official or community) was found for this repo in this research pass.

---

## Candidate: TriplaneGaussian (TGS)

### Takeaway
TriplaneGaussian takes a single-view image (general objects, not head-specialized) and outputs 3D Gaussian Splats (`.ply`) in a few seconds; it is NOT a head/face project (trained only on Objaverse-LVIS, ~45K synthetic 3D objects) and has no facial-expression or blendshape mechanism at all. Code license is unconfirmed on GitHub itself, though the Hugging Face model card for the weights states Apache-2.0 (third-party corroborated) — this is a licensing conflict/gap, not a confirmed clean answer.

### Cited Findings
- Repo: [github.com/VAST-AI-Research/TriplaneGaussian](https://github.com/VAST-AI-Research/TriplaneGaussian), CVPR 2024, "Triplane Meets Gaussian Splatting: Fast and Generalizable Single-View 3D Reconstruction" — [CVPR paper](https://openaccess.thecvf.com/content/CVPR2024/papers/Zou_Triplane_Meets_Gaussian_Splatting_Fast_and_Generalizable_Single-View_3D_Reconstruction_CVPR_2024_paper.pdf)
- "Fast reconstruction from single-view images in a few seconds based on a hybrid Triplane-Gaussian 3D representation" — general object reconstruction, not head-specific — [TriplaneGaussian repo](https://github.com/VAST-AI-Research/TriplaneGaussian)
- Inference script saves a rendered video and a 3DGS `.ply` file compatible with the graphdeco-inria/gaussian-splatting PLY layout; no mesh/GLB export mentioned in the official repo — [TriplaneGaussian repo](https://github.com/VAST-AI-Research/TriplaneGaussian)
- Model checkpoint hosted on Hugging Face (VAST-AI/TriplaneGaussian), trained only on the Objaverse-LVIS dataset (~45K 3D models) — [HF model card](https://huggingface.co/VAST-AI/TriplaneGaussian/blob/main/README.md?code=true)
- HF model card metadata lists Apache-2.0 for the weights; third-party aggregator (PromptLayer) corroborates Apache-2.0; however, the GitHub repo itself does not explicitly state a license in its README per a third-party summary — direct LICENSE file not independently confirmed — [HF model card](https://huggingface.co/VAST-AI/TriplaneGaussian/blob/main/README.md?code=true); [PromptLayer listing](https://www.promptlayer.com/models/triplanegaussian)
- Requires diff-gaussian-rasterization, pytorch_scatter, pointnet2_ops, PyTorch3D; Gradio demo depends on a custom 3DGS Gradio component — [TriplaneGaussian repo](https://github.com/VAST-AI-Research/TriplaneGaussian)

### Inferences
- Because TGS is a general-object model (Objaverse-trained), it has no face/head understanding at all — feeding it a portrait photo would likely produce a crude, non-anatomically-informed 3D blob rather than a usable head reconstruction; it is included here only because it is one of the few single-image Gaussian Splatting projects with a somewhat-established Gaussian→viewable-asset ecosystem, not because it's fit for a head-avatar pipeline.
- Zero facial rig or expression mechanism means ARKit/Oculus blendshape integration would be "effectively infeasible" without essentially building a new head-specific system on top.

### Gaps
- GitHub repo's own LICENSE file was not independently fetched/confirmed; Apache-2.0 is reported only via the HF model card and a third-party aggregator, creating a potential license mismatch between code and weights that could not be resolved with the sources available.
- No GPU/VRAM figures, training time, or maintenance/last-commit-date were confirmed in this pass.

---

## Candidate: LGM (Large Multi-View Gaussian Model)

### Takeaway
LGM is a general-object (not head-specific) image/text-to-3D generator; its `test_path` argument explicitly accepts "a folder containing images, or a single image," and it ships an official `convert.py` mesh-extraction step (via nvdiffrast) from the Gaussian `.ply` — this is the clearest "official Gaussian-to-mesh" path found in this entire survey, though GLB specifically is only confirmed via third-party/community tooling (Replicate's `camenduru/lgm-ply-to-glb`), not the official repo itself. Code is MIT-licensed per GitHub's label; no facial-expression/blendshape mechanism exists since it's not head-specialized. Inference needs ~10GB GPU memory.

### Cited Findings
- Repo: official is [github.com/3DTopia/LGM](https://github.com/3DTopia/LGM) (ECCV 2024 Oral); a personal mirror also exists at xiyichen/LGM — [LGM repo](https://github.com/3DTopia/LGM); [arXiv 2402.05054](https://arxiv.org/pdf/2402.05054)
- `--test_path` accepts "a folder containing images, or a single image"; the Gradio app is described as "text/image to 3D" — single-image input is supported, though the underlying pipeline may route single images through MVDream/ImageDream multi-view synthesis first (not fully confirmed from the page) — [LGM repo](https://github.com/3DTopia/LGM)
- Output is Gaussian splats saved as `.ply` (`saved.ply`) plus an `.mp4`; `gui.py` visualizes the `.ply` — [LGM repo](https://github.com/3DTopia/LGM)
- Official `convert.py` converts the saved `.ply` to a mesh; requires nvdiffrast (`pip install git+https://github.com/NVlabs/nvdiffrast`) explicitly labeled "for mesh extraction," plus a diff-gaussian-rasterization fork — this is a real, documented Gaussian→mesh conversion step provided by the authors — [LGM repo](https://github.com/3DTopia/LGM)
- GLB export specifically is confirmed via a third-party Replicate model, `camenduru/lgm-ply-to-glb`, described as open source and runnable locally via Docker; a community Hugging Face Gradio app for LGM also converts to `.glb` — neither is the official repo's own output format, and the official repo does not state what mesh format `convert.py` produces — [Replicate listing](https://replicate.com/camenduru/lgm-ply-to-glb); [search-reported HF Gradio app, unverified via direct fetch]
- No blendshape/facial-rig support mentioned — not a head-specialized tool — [LGM repo](https://github.com/3DTopia/LGM)
- License: file named `LICENSE`, GitHub sidebar/footer label "MIT license"; full text not confirmed; no commercial-use statement found beyond the MIT label — [LGM repo](https://github.com/3DTopia/LGM)
- GPU: "Inference takes about 10GB GPU memory (loading all imagedream, mvdream, and our LGM)"; training configs exist for 1 GPU and 8 GPUs with SLURM multi-node support, but no VRAM/duration figures for training — [LGM repo](https://github.com/3DTopia/LGM)
- Maintenance: only 17 commits visible; most recent dated item is a "2024.4.3" news entry about a rotation-normalization fix and new checkpoints; 61 open issues, 3 open PRs — suggests the project has had limited recent updates relative to its issue backlog — [LGM repo](https://github.com/3DTopia/LGM)

### Inferences
- LGM is the strongest technical example in this survey of an "official" Gaussian-splat-to-mesh conversion path (marching-cubes-style extraction via nvdiffrast), but it is a general-object generator with zero face/head specialization or training data for faces specifically — using it on a portrait photo would likely yield a low-fidelity, non-anatomically-correct head blob (and, per the pipeline note about MVDream/ImageDream, may synthesize inconsistent pseudo-multi-view faces from a single photo, which is a known failure mode of these general multi-view-diffusion-based 3D generators for human faces).
- No blendshape bridge exists at all for LGM; any ARKit/Oculus rig would need to be built entirely post-hoc after retopology, which is a difficult, bespoke undertaking given the model's generic/low-fidelity mesh output for faces.

### Gaps
- Mesh output file format from `convert.py` (OBJ vs GLB natively) not confirmed from the official repo; GLB specifically relies on third-party tooling.
- VRAM/training-time figures for training (vs. the confirmed ~10GB inference figure) not found.
- Exact last-commit date not confirmed (dated content found was a "2024.4.3" news item, not a verified git commit timestamp).

---

## Candidate: GASP (Gaussian Avatars with Synthetic Priors) — Microsoft Research

### Takeaway
GASP (Microsoft Research, Dec 2024) explicitly claims single-photo (or short video) enrollment producing a 360°-renderable Gaussian avatar via a synthetic-data prior, but as of this research pass NO public source code repository could be found — the project page links only to the paper, arXiv, and a video, with no GitHub/code link and no license statement for code or weights.

### Cited Findings
- Project page: [microsoft.github.io/GASP](https://microsoft.github.io/GASP); paper: [arXiv 2412.07739](https://arxiv.org/html/2412.07739v1); authors Jack Saunders, Charlie Hewitt, et al. (Microsoft, University of Bath, Georgia Tech) — [GASP project page](https://microsoft.github.io/GASP)
- "We require only a short video or even a single image" for enrollment; the synthetic-data prior is fitted to "a single photo or video" before fine-tuning, and the prior is used only during fitting, not at inference, enabling real-time use — [GASP project page](https://microsoft.github.io/GASP)
- Output described as a "Gaussian Avatar" with per-Gaussian features; no mesh is mentioned on the project page — [GASP project page](https://microsoft.github.io/GASP)
- No GitHub or code-repository link found on the project page as of this check — [GASP project page](https://microsoft.github.io/GASP)
- No license statement for code or weights found; footer only lists generic Microsoft Privacy/Terms/Trademarks links — [GASP project page](https://microsoft.github.io/GASP)
- No blendshape or FLAME mention found on the project page, though the synthetic training data is noted to have "exact correspondence to the underlying 3DMM" — [GASP project page](https://microsoft.github.io/GASP)

### Inferences
- Despite being the single best match on paper for "single photo → Gaussian avatar," GASP is currently NOT a usable open-source/self-hostable option because no code has been publicly released (as far as this research could determine) — it should be tracked for a future code release but cannot be recommended today.

### Gaps
- Code release status could not be fully confirmed beyond "no link found on the project page" — a targeted check of the paper's GitHub-link section, the authors' personal GitHub pages, or a direct search for "GASP microsoft code release" would be a reasonable follow-up if this project becomes more important to the user later.
- License, GPU/VRAM requirements, mesh-export capability, and blendshape support are all unconfirmed due to the absence of a public repo.

---

## Candidates Flagged But Not Investigated (Budget-Limited)

### Takeaway
Several additional candidates surfaced during search but were not independently fetched/verified due to research-call budget; listing them here as explicit gaps/leads rather than fabricating assessments.

### Cited Findings
- MVCHead (humansensinglab/MVCHead) — CC BY-NC 4.0 license (non-commercial), trains without multi-view data — [MVCHead repo](https://github.com/humansensinglab/MVCHead)
- GSAC (VU-RASL/GSAC) — Gaussian splatting avatar from a single phone-recorded rotating video (not a single still photo) — [GSAC repo](https://github.com/michaelrubloff/GSAC)
- Next3D and InstantMesh/CRM/Unique3D-style general single-image-to-mesh diffusion pipelines were identified as a category but not individually investigated in this pass, since they are general-object/GAN-inversion tools rather than head-specialized splatting/NeRF avatar systems.

### Gaps
- These were not independently verified for input requirements, license, mesh/GLB export, or blendshape support — flagged for potential follow-up research rather than guessed at.

# Open-Source Single-Photo Mesh-Based 3D Face/Head Reconstruction (3DMM/FLAME-based deep learning)

Scope note: Gaussian Splatting/NeRF approaches and paid/hosted services (D-ID, Simli, HeyGen, Ready Player Me, Avaturn) are explicitly excluded per assignment and not covered below.

## DECA (yfeng95/DECA) — single-photo FLAME-based animatable detailed face model

### Takeaway
DECA takes one in-the-wild photo and reconstructs a FLAME-based 3D head mesh (OBJ output, optional extracted texture); it is widely used as a base for downstream rigging, but has NO native GLB/ARKit/Oculus blendshape export, and both the code and dependent FLAME model are under a Max Planck non-commercial research-only license — commercial use is explicitly prohibited.

### Cited Findings
- Official repo is github.com/yfeng95/DECA ("YadiraF/DECA" historically); GitHub API confirms `license.key: "other"`, last push 2023-07-23, not archived — [GitHub API](https://api.github.com/repos/yfeng95/DECA), [MPI project page](https://is.mpg.de/code/deca-learning-an-animatable-detailed-3d-face-model-from-in-the-wild-images)
- README: "DECA reconstructs a 3D head model with detailed facial geometry from a single input image," and can "generate an obj file (which can be opened with Meshlab) that includes extracted texture from the input image" — [README](https://raw.githubusercontent.com/yfeng95/DECA/master/README.md)
- No mention of GLB/glTF export, ARKit, or Oculus blendshapes anywhere in the README; expression transfer / reposing demos exist but no rig/skeleton is described — [README](https://raw.githubusercontent.com/yfeng95/DECA/master/README.md)
- LICENSE text: "Any other use, in particular any use for commercial, pornographic, military, or surveillance purposes is prohibited," grant is "for non-commercial scientific research, education, or artistic projects" only, no redistribution/reverse engineering, commercial licensing must go through ps-license@tue.mpg.de — [LICENSE](https://raw.githubusercontent.com/yfeng95/DECA/master/LICENSE)
- DECA also requires the separate FLAME model download/weights, which carries its own license (see FLAME section below) — [README](https://raw.githubusercontent.com/yfeng95/DECA/master/README.md)
- No GPU/VRAM figures stated in README; stack is Python 3.7 + PyTorch ≥1.6, optional pytorch3d — [README](https://raw.githubusercontent.com/yfeng95/DECA/master/README.md)

### Inferences
- Because both the DECA code license and the FLAME model license (which DECA depends on for its base mesh topology) are non-commercial research-only, DECA cannot be used in a commercial product under its current licensing, regardless of any technical GLB/ARKit conversion path.
- Getting from DECA's OBJ+texture output to an ARKit/Oculus-rigged GLB would require building a custom FLAME→ARKit blendshape mapping pipeline from scratch (not provided), making integration difficult even before the licensing blocker.

### Gaps
- No documented GLB/glTF export path found, confirmed or denied — treat as "no evidence found," not confirmed absent.
- Exact VRAM/GPU minimums for inference are not stated in the README.

## 3DDFA / 3DDFA_V2 (cleardusk/3DDFA_V2) — fast single-image dense face alignment

### Takeaway
3DDFA_V2 is MIT-licensed (code), supports single-photo input, runs CPU-only efficiently, and outputs OBJ/PLY dense mesh plus UV texture coordinates — but it is a dense-alignment/landmark network, not a FLAME/ARKit-rigged model, and has no blendshape or GLB export support.

### Cited Findings
- Official repo cleardusk/3DDFA_V2; GitHub API confirms `license.key: "mit"`, `license.name: "MIT License"`, last push 2024-02-02, not archived — [GitHub API](https://api.github.com/repos/cleardusk/3DDFA_V2)
- LICENSE file text confirms MIT License with copyright holders Max deGroot/Ellis Brown (2017), Zisian Wong/Shifeng Zhang (2019), Jianzhu Guo/CBSR (2020); permits commercial use, copy, modify, sell, sublicense, no warranty — [LICENSE](https://raw.githubusercontent.com/cleardusk/3DDFA_V2/master/LICENSE)
- README: single still-image demo (`python3 demo.py -f examples/inputs/emma.jpg --onnx`); supported outputs include `.ply`, `.obj`, `uv_tex` (UV texture map), `depth`, `pncc`, `pose` — [README](https://raw.githubusercontent.com/cleardusk/3DDFA_V2/master/readme.md)
- CPU-only is explicitly supported and fast: benchmarked on a 13" MacBook Pro CPU, ~1.35ms/image with ONNX backend and 4 threads — [README](https://raw.githubusercontent.com/cleardusk/3DDFA_V2/master/readme.md)
- No mention anywhere in README of blendshapes, ARKit, Oculus visemes, GLB/glTF export, or a rig — [README](https://raw.githubusercontent.com/cleardusk/3DDFA_V2/master/readme.md)
- No separate pretrained-weights license statement found distinct from the MIT code license (weights ship in-repo under the same MIT terms as far as documented).

### Inferences
- 3DDFA_V2's dense mesh follows the BFM/3DMM topology (via its FaceBoxes/3DMM lineage), so any blendshape rig would have to be built by mapping that fixed-topology mesh to ARKit shapes manually — no existing conversion path is documented.
- Because it's genuinely MIT with no FLAME/BFM-weights non-commercial clause documented in the repo itself, this is one of the more commercially-friendly candidates on the licensing axis, though the FaceBoxes-derived face detector component's own upstream license was not separately verified.

### Gaps
- Could not verify whether the bundled FaceBoxes detector component carries a different (e.g., research-only) license than the MIT top-level license.
- No GPU/VRAM requirement applicable since CPU inference is the documented path.

## MICA (Zielon/MICA) — metrical reconstruction of human faces (FLAME shape-only)

### Takeaway
MICA reconstructs FLAME shape parameters (identity-only, not expression) from a photo, outputs a PLY mesh plus raw FLAME `.npy` parameters with no texture, no blendshapes, and depends on the separately-licensed FLAME2020 model; the MICA code itself carries the same Max Planck non-commercial research license as DECA/EMOCA.

### Cited Findings
- Official repo github.com/Zielon/MICA; GitHub API confirms `license.key: "other"`, last push 2025-03-17, not archived — [GitHub API](https://api.github.com/repos/Zielon/MICA)
- LICENSE page title: "Software Copyright License for non-commercial scientific research purposes," grant limited to "non-commercial scientific research, education, or artistic projects," explicitly: "Any other use, in particular any use for commercial, pornographic, military, or surveillance purposes is prohibited" — [LICENSE](https://raw.githubusercontent.com/Zielon/MICA/master/LICENSE)
- README: demo processes images from a `demo/input/` folder, producing per-subject outputs of a `.ply` mesh, a rendered image, and `.npy` FLAME parameters; no texture output documented — [README](https://raw.githubusercontent.com/Zielon/MICA/master/README.md)
- No mention of blendshapes, ARKit, Oculus visemes, GLB/glTF export, or animation rig in the README — [README](https://raw.githubusercontent.com/Zielon/MICA/master/README.md)
- Requires separate FLAME2020 model download, which needs registration and its own license agreement (see FLAME section) — [README](https://raw.githubusercontent.com/Zielon/MICA/master/README.md)
- MICA's training dataset license is explicitly described elsewhere as "restricted to academic, non-commercial usage" since it extends existing datasets — [MICA project page](https://zielon.github.io/mica)

### Inferences
- MICA only recovers identity/shape, not expression — it is the least suited of the FLAME-family candidates for a talking-avatar pipeline needing jaw/mouth blendshapes, since no expression or jaw-open signal is reconstructed at all.
- Commercial use is blocked both by the MICA code license and by the FLAME2020 base model's non-commercial research license (unless the newer CC-BY FLAME 2023 Open variant could be substituted — not confirmed as compatible with MICA's pretrained weights).

### Gaps
- Could not confirm whether MICA's pretrained encoder weights carry a license distinct from the repo's own non-commercial LICENSE file (no separate weights-license page found; assume same non-commercial terms apply, but this is not explicitly separately documented for the weights file itself).

## Deep3DFaceRecon_pytorch (sicxu/Deep3DFaceRecon_pytorch) — PyTorch Deep3DFaceReconstruction

### Takeaway
This repo's own code is MIT-licensed and permits commercial use, but it requires the Basel Face Model (BFM) 2009 morphable model as a mandatory dependency, which requires a separate application/license agreement from the University of Basel with its own (non-MIT) terms not reproduced in this repo — making true end-to-end commercial legality dependent on BFM's license, which was not fully retrievable in this research pass.

### Cited Findings
- Official repo sicxu/Deep3DFaceRecon_pytorch; GitHub API confirms `license.key: "mit"`, `license.name: "MIT License"`, last push 2024-11-26, not archived — [GitHub API](https://api.github.com/repos/sicxu/Deep3DFaceRecon_pytorch)
- LICENSE file: MIT License, copyright Sicheng Xu (2022); permits use/copy/modify/merge/publish/distribute/sublicense/sell with no restriction on commercial use, standard MIT no-warranty clause — [LICENSE](https://raw.githubusercontent.com/sicxu/Deep3DFaceRecon_pytorch/master/LICENSE)
- README: requires BFM09 model ("01_MorphableModel.mat") obtained "through the BFM website" after application; expression basis (`Exp_Pca.bin`) sourced from Guo et al.'s FaceWarehouse-derived data via a separate Google Drive link — [README](https://raw.githubusercontent.com/sicxu/Deep3DFaceRecon_pytorch/master/README.md)
- Output: `.obj` mesh with vertex color/texture and illumination baked in, `.mat` file with 257 coefficients + 68 projected 2D landmarks, and a composite `.png` — no separate UV texture map or GLB/glTF export documented — [README](https://raw.githubusercontent.com/sicxu/Deep3DFaceRecon_pytorch/master/README.md)
- No mention of blendshapes, ARKit, or Oculus visemes; expression basis exists but is not exposed as a blendshape rig — [README](https://raw.githubusercontent.com/sicxu/Deep3DFaceRecon_pytorch/master/README.md)
- GPU: tested only on Ubuntu/Nvidia+CUDA (Windows noted as possibly workable); rendering via Nvdiffrast, OpenGL-free fallback via `--use_opengl False`; training benchmarked on a single Tesla M40 (~0.8–0.9s/iteration); no inference-time VRAM figure given — [README](https://raw.githubusercontent.com/sicxu/Deep3DFaceRecon_pytorch/master/README.md)
- Upstream Microsoft original (Deep3DFaceReconstruction, now unmaintained in favor of this PyTorch port) is also MIT-licensed — [awesome.ecosyste.ms listing](https://awesome.ecosyste.ms/projects/github.com%2Fmicrosoft%2FDeep3DFaceReconstruction)

### Inferences
- The repo code being MIT is necessary but not sufficient for commercial use — the mandatory BFM09 "01_MorphableModel.mat" dependency is the real gating factor and was historically academic/research-oriented for the Basel Face Model; this needs direct confirmation from the University of Basel's BFM license page before any commercial decision (not independently re-verified in this pass beyond "requires application").
- Output is a static textured mesh with baked lighting/color, not a rig — any ARKit/Oculus blendshape pipeline would need to be built entirely from scratch on top of the fixed BFM topology.

### Gaps
- Could not retrieve the exact current text of the Basel Face Model (BFM) license terms in this research pass (would need to check https://faces.dmi.unibas.ch/bfm/ directly) — flagging as unverified rather than assuming it is permissive or restrictive.
- No explicit inference-time VRAM minimum found.

## EMOCA (radekd91/emoca) — emotion-driven monocular face capture and animation

### Takeaway
EMOCA takes a single in-the-wild photo and reconstructs a FLAME-based 3D face with expression detail (an improvement on DECA for emotional expressiveness), but like DECA it is under the Max Planck non-commercial research license, has no documented GLB/ARKit/Oculus export, and the project itself notes it is now deprecated in favor of the authors' newer "inferno" library.

### Cited Findings
- Official repo radekd91/emoca; GitHub API confirms `license.key: "other"`, last push 2024-12-06, not archived — [GitHub API](https://api.github.com/repos/radekd91/emoca)
- README: "EMOCA takes a single in-the-wild image as input and reconstructs a 3D face... EMOCA is now deprecated in favour of inferno" — [README](https://raw.githubusercontent.com/radekd91/emoca/master/README.md)
- LICENSE: "Software Copyright License for non-commercial scientific research purposes," identical structure to DECA/MICA — "Any other use, in particular any use for commercial, pornographic, military, or surveillance purposes is prohibited," commercial inquiries via ps-license@tue.mpg.de — [LICENSE](https://raw.githubusercontent.com/radekd91/emoca/master/LICENSE), also listed at [MPI project page](https://is.mpg.de/code/emoca-emotion-driven-monocular-face-capture-and-animation)
- Builds on DECA as "a fixed part of the model"; output format/texture-map details not explicitly spelled out in README beyond "coarse shape" and "detailed displacements" — [README](https://raw.githubusercontent.com/radekd91/emoca/master/README.md)
- No mention of blendshapes, ARKit, Oculus visemes, or GLB/glTF export — [README](https://raw.githubusercontent.com/radekd91/emoca/master/README.md)
- FLAME itself (which EMOCA uses) is described elsewhere as "publicly available under Creative Commons Attribution license" per the FLAME-Universe aggregator page, which conflicts with the stricter non-commercial terms on the main flame.is.tue.mpg.de model-license page for the original FLAME releases — see FLAME section for the resolution of this apparent conflict — [FLAME-Universe](https://github.com/TimoBolkart/FLAME-Universe)
- GPU: developed with PyTorch 1.12.1 + PyTorch3D 0.6.2 + CUDA 11.1.1/cuDNN 8.0.5; README notes PyTorch3D compilation "can be tricky and machine-specific" — [README](https://raw.githubusercontent.com/radekd91/emoca/master/README.md)

### Inferences
- EMOCA is functionally the most relevant DECA-family candidate for a talking-avatar use case (expression detail, not just identity), but is blocked from commercial use by the same MPG non-commercial license as DECA/MICA.
- Given the authors' own deprecation notice in favor of "inferno," anyone adopting EMOCA today should treat it as semi-maintained/legacy rather than actively developed, despite recent commit activity.

### Gaps
- Could not determine EMOCA's exact mesh/texture output file format from the README (OBJ vs other) — not explicitly stated in the fetched content.
- Did not independently verify the "inferno" successor library's licensing, which was out of scope for this pass but may be relevant for future research.

## HRN (youngLBW/HRN) — Hierarchical Representation Network (CVPR 2023)

### Takeaway
HRN's own repository code is Apache-2.0 licensed (commercially permissive on its face) and supports single-image reconstruction with detailed displacement/texture maps, but it depends on an external parametric face model whose own license was not found/verified in this pass, and it has no documented blendshape/ARKit/GLB export path.

### Cited Findings
- Official repo confirmed at github.com/youngLBW/HRN; GitHub API shows `license.key: "apache-2.0"`, `license.name: "Apache License 2.0"`, last push 2024-07-12, not archived — [GitHub API](https://api.github.com/repos/youngLBW/HRN)
- README: supports a `single_view` demo mode for single-image reconstruction, plus a separate `multi_view` mode for multiple images of the same subject; mentions "displacement map" and "texture map generation" for high-frequency detail — [README](https://raw.githubusercontent.com/youngLBW/HRN/main/README.md)
- No mention anywhere in README of OBJ/PLY/GLB file format names explicitly, nor of blendshapes, ARKit, Oculus visemes, or an animation rig — [README](https://raw.githubusercontent.com/youngLBW/HRN/main/README.md)
- No LICENSE terms or restrictions mentioned in the README body itself (license info comes solely from the GitHub API's license-detection, not from README text) — [README](https://raw.githubusercontent.com/youngLBW/HRN/main/README.md)
- GPU: "This implementation is only tested under Ubuntu/CentOS environment with Nvidia GPUs and CUDA installed," PyTorch ≥1.6, Python ≥3.8; no VRAM figure given — [README](https://raw.githubusercontent.com/youngLBW/HRN/main/README.md)
- Project/paper page: https://younglbw.github.io/HRN-homepage/, arXiv 2302.14434, introduces the FaceHD-100 high-quality 3D face dataset — [arXiv](https://arxiv.org/pdf/2302.14434.pdf)

### Inferences
- Because HRN's README doesn't name its underlying parametric base model's license (the project builds on a hierarchical shape/detail representation that in related literature is typically tied to a BFM/FaceVerse/FLAME-style base), the Apache-2.0 code license should NOT be read as clearing the whole pipeline for commercial use — the dependency's weight/model license must be checked separately before relying on this as a commercially-safe option.
- This is the only candidate found in this research pass with a permissive (Apache-2.0) repository-level license alongside single-photo support, making it worth deeper follow-up specifically on its base-model dependency.

### Gaps
- Could not identify or verify the license of HRN's required base 3DMM/parametric model weights in this pass — this is a material open question before treating HRN as commercially usable.
- No confirmation of GLB/glTF export or blendshape capability either way — "no evidence found," not confirmed absent.

## SynergyNet (choyingw/SynergyNet) — 3DMM + 3D landmarks synergy

### Takeaway
SynergyNet is MIT-licensed, supports single-image inference, and outputs a dense (53,215-point) 3DMM-based mesh plus landmarks and pose, with an optional UV-texture-GAN texturing workflow — but it has no documented blendshape, ARKit, or GLB/glTF export, and GPU is recommended (CPU possible with code modification).

### Cited Findings
- Official repo choyingw/SynergyNet; GitHub API confirms `license.key: "mit"`, `license.name: "MIT License"`, last push 2026-02-24, not archived — [GitHub API](https://api.github.com/repos/choyingw/SynergyNet)
- LICENSE file: MIT License, copyright Cho Ying Wu (2021); standard permissive terms allowing commercial use, modification, sublicensing, sale, no warranty — [LICENSE](https://raw.githubusercontent.com/choyingw/SynergyNet/main/LICENSE)
- README: single-image demo via `python singleImage.py -f img`, or API call with `cv2.imread(<path>)`; outputs 68 3D landmarks, a dense face mesh of 53,215 points, and Euler-angle pose; textured workflows (UV-texture-GAN) save "3D meshes and renderings" but exact file format not named — [README](https://raw.githubusercontent.com/choyingw/SynergyNet/main/README.md)
- No mention of blendshapes, ARKit, Oculus visemes, GLB/glTF export, or animation rig — [README](https://raw.githubusercontent.com/choyingw/SynergyNet/main/README.md)
- GPU: "The default inference requires a compatible GPU to run," but CPU is possible by commenting out `.cuda()` calls and loading weights on CPU; training used ~19GB VRAM on an RTX 3090 (~6 hours); inference benchmarked at ~3000 fps on a laptop RTX 2080 — [README](https://raw.githubusercontent.com/choyingw/SynergyNet/main/README.md)
- The project explicitly builds on 3DDFA, FSA-Net, and 3DDFA-V2 for its face detector/renderer, so those upstream components' licenses may also apply — [README](https://raw.githubusercontent.com/choyingw/SynergyNet/main/README.md)

### Inferences
- SynergyNet's dense mesh is 3DMM-topology (not FLAME), so there is no existing FLAME→ARKit conversion path that would apply to it directly; a custom mapping would be needed from its specific 3DMM topology to ARKit blendshapes.
- Being MIT with no separately-licensed mandatory base model mentioned (unlike Deep3DFaceRecon_pytorch's BFM dependency), SynergyNet appears to be one of the more commercially clean options on paper, modulo verifying the 3DDFA/FSA-Net upstream component licenses it depends on.

### Gaps
- Did not independently re-verify the licenses of the upstream 3DDFA / FSA-Net / 3DDFA-V2 components SynergyNet borrows code from.
- Exact mesh output file format (OBJ/PLY) not explicitly confirmed from README text retrieved.

## PIFuHD (facebookresearch/pifuhd) — excluded/not well-suited

### Takeaway
PIFuHD is a single-image, implicit-function full-body human digitization method, not a face/head-specific FLAME/3DMM mesh pipeline; the official repo is archived, under a non-commercial "Other" license, and produces a geometry-only mesh with no face rig or blendshapes — it is a poor fit for this objective and is noted only for completeness.

### Cited Findings
- Official repo facebookresearch/pifuhd: GitHub API shows `archived: true`, `license.key: "other"`, `license.name: "Other"` — [GitHub API](https://api.github.com/repos/facebookresearch/pifuhd)
- A third-party mirror lists the license as CC-BY-NC 4.0 (non-commercial); the official USC VGL project page for the related PIFu method states the software "is made available for academic or non-commercial purposes only," with commercial use requiring a separate paid license — [USC VGL project page](https://vgl.ict.usc.edu/Software/PIFu/), [mirror license listing](https://awesome.ecosyste.ms/projects/1078919)
- PIFuHD targets whole-body clothed-human shape reconstruction from a single image, not specifically detailed/textured face/head meshes — [PIFuHD project page](https://shunsukesaito.github.io/PIFuHD)

### Inferences
- Given it is archived, non-commercial-licensed, and not face-specialized (no FLAME/3DMM parametrization, no expression basis), PIFuHD should be excluded from consideration for an ARKit/Oculus-blendshape-driven talking avatar pipeline.

### Gaps
- Did not deeply verify PIFuHD's exact current LICENSE file text (GitHub API only reports "Other"/NOASSERTION) since the project is out of scope for the mesh-based face/head objective.

## FLAME base model licensing (dependency for DECA, EMOCA, MICA, and other FLAME-based fits)

### Takeaway
The original FLAME models (2017/2019/2020/2023, and the FLAME Blender Add-on) are under a Max Planck non-commercial academic license requiring registration, while a newer "FLAME 2023 Open" variant is released under CC-BY-4.0 (commercially permissive with attribution) — but the DECA/EMOCA/MICA pretrained pipelines reviewed in this pass were documented against the original non-commercial FLAME releases, not confirmed as compatible/retrained with FLAME 2023 Open.

### Cited Findings
- flame.is.tue.mpg.de model license page: original FLAME models are licensed "for non-commercial scientific research purposes," installable for "non-commercial research, education, or artistic work"; commercial use requires contacting ps-license@tue.mpg.de; governed by German law — [FLAME model license](https://flame.is.tue.mpg.de/modellicense.html)
- The FLAME project's own news/release notes state "FLAME 2023 Open" is released under a Creative Commons Attribution (CC-BY-4.0) license, permitting sharing/adaptation including commercial use with attribution, while "previous versions are only available for non-commercial research purposes" — [FLAME homepage](https://flame.is.tue.mpg.de/)
- Access to any FLAME version requires account registration and agreeing to the applicable license before download — [FLAME homepage](https://flame.is.tue.mpg.de/)

### Inferences
- Any FLAME-dependent pipeline (DECA, EMOCA, MICA as reviewed here) that was built/pretrained against the original non-commercial FLAME releases cannot simply be declared commercially clear by pointing to FLAME 2023 Open's CC-BY license — the actual pretrained weights and code in these repos reference the original FLAME, and swapping to FLAME 2023 Open would likely require retraining/reverification, which none of the reviewed repos document having done.

### Gaps
- Could not confirm whether any of DECA/EMOCA/MICA have been updated or offer a retrained variant compatible with FLAME 2023 Open's commercially-permissive license; absent that confirmation, assume the non-commercial FLAME license applies to all three pipelines as currently documented.

## Cross-cutting: GLB/glTF export and ARKit/Oculus blendshape support across all candidates

### Takeaway
Across every candidate reviewed (DECA, 3DDFA_V2, MICA, Deep3DFaceRecon_pytorch, EMOCA, HRN, SynergyNet), no repository's README documents a native or built-in GLB/glTF export, nor native ARKit blendshape or Oculus viseme support — all outputs are static OBJ/PLY meshes (some with baked or UV texture), and any ARKT/Oculus rig would require a separate, undocumented conversion pipeline to be built by the integrator.

### Cited Findings
- DECA README: OBJ output only, no GLB/ARKit mention — [README](https://raw.githubusercontent.com/yfeng95/DECA/master/README.md)
- 3DDFA_V2 README: PLY/OBJ/UV-texture output only, no GLB/ARKit mention — [README](https://raw.githubusercontent.com/cleardusk/3DDFA_V2/master/readme.md)
- MICA README: PLY + FLAME `.npy` params only, no GLB/ARKit mention — [README](https://raw.githubusercontent.com/Zielon/MICA/master/README.md)
- Deep3DFaceRecon_pytorch README: OBJ + `.mat` coefficients only, no GLB/ARKit mention — [README](https://raw.githubusercontent.com/sicxu/Deep3DFaceRecon_pytorch/master/README.md)
- EMOCA README: no explicit file format named, no GLB/ARKit mention — [README](https://raw.githubusercontent.com/radekd91/emoca/master/README.md)
- HRN README: displacement/texture maps only, no file format or GLB/ARKit mention — [README](https://raw.githubusercontent.com/youngLBW/HRN/main/README.md)
- SynergyNet README: raw point-array mesh + optional UV texture GAN, no GLB/ARKit mention — [README](https://raw.githubusercontent.com/choyingw/SynergyNet/main/README.md)

### Inferences
- For any of these candidates, reaching an ARKit/Oculus-blendshape-driven GLB would require, at minimum: (1) exporting/converting the static mesh+texture to glTF (straightforward, well-documented tooling exists generically, e.g. Blender/trimesh — not evaluated here as it's generic, not project-specific), and (2) building a custom per-topology rig/blendshape basis mapping from the model's native mesh (FLAME topology for DECA/EMOCA/MICA; BFM topology for Deep3DFaceRecon_pytorch; model-specific dense topology for 3DDFA_V2/SynergyNet/HRN) to the ARKit 52-shape or Oculus viseme basis — none of the reviewed repos provide this mapping, so integration difficulty is "difficult" for all of them specifically on the rigging/blendshape dimension, even though static mesh export (OBJ/PLY→GLB) is comparatively easy.
- FLAME-topology candidates (DECA, EMOCA, MICA) are the most promising long-term path for ARKit conversion because FLAME's fixed, well-documented topology and existing community tooling (e.g., third-party FLAME-to-blendshape rigging projects referenced broadly in the FLAME ecosystem) make a one-time topology-to-ARKit mapping more reusable across models than mapping each model's distinct non-FLAME topology individually — however, no such a ready-made, documented FLAME→ARKit blendshape conversion repository was found/verified in this research pass, so this remains an inference, not a confirmed existing tool.

### Gaps
- Did not find any existing open-source project that documents a working FLAME-mesh-to-ARKit-blendshape-basis conversion pipeline; this would be a necessary next research step if a FLAME-based candidate (DECA/EMOCA/MICA) is chosen.
- Did not evaluate generic OBJ/PLY→GLB conversion tooling (e.g., Blender scripting, trimesh, assimp) in depth since it is model-agnostic; noted as plausible/standard but not specifically verified against each project's exact mesh/texture output structure.

## Maintenance status summary (last commit dates, as of 2026-11-06)

### Takeaway
All seven reviewed repositories are unarchived and show commit activity within roughly the last two years, with SynergyNet showing the most recent push; none are formally archived by their maintainers, though EMOCA's own README states the project is deprecated in favor of a successor library.

### Cited Findings
- yfeng95/DECA: last push 2023-07-23, not archived — [GitHub API](https://api.github.com/repos/yfeng95/DECA)
- cleardusk/3DDFA_V2: last push 2024-02-02, not archived — [GitHub API](https://api.github.com/repos/cleardusk/3DDFA_V2)
- Zielon/MICA: last push 2025-03-17, not archived — [GitHub API](https://api.github.com/repos/Zielon/MICA)
- radekd91/emoca: last push 2024-12-06, not archived, but README states "EMOCA is now deprecated in favour of inferno" — [GitHub API](https://api.github.com/repos/radekd91/emoca), [README](https://raw.githubusercontent.com/radekd91/emoca/master/README.md)
- sicxu/Deep3DFaceRecon_pytorch: last push 2024-11-26, not archived — [GitHub API](https://api.github.com/repos/sicxu/Deep3DFaceRecon_pytorch)
- choyingw/SynergyNet: last push 2026-02-24, not archived — [GitHub API](https://api.github.com/repos/choyingw/SynergyNet)
- youngLBW/HRN: last push 2024-07-12, not archived — [GitHub API](https://api.github.com/repos/youngLBW/HRN)
- facebookresearch/pifuhd (excluded candidate, listed for reference only): `archived: true` — [GitHub API](https://api.github.com/repos/facebookresearch/pifuhd)

### Inferences
- None of the in-scope candidates are abandoned/archived at the repository level, but EMOCA's self-declared deprecation means new users should prefer the authors' "inferno" successor if adopting that research lineage going forward (inferno's own licensing was not evaluated in this pass).

### Gaps
- Did not evaluate the "inferno" successor library (to EMOCA) for licensing, single-photo support, or blendshape capability — flagged as a candidate for follow-up research if the FLAME/MPG lineage is pursued further.

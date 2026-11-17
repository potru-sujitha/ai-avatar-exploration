# Phase 20 plan / checkpoint log
1. [ ] Hair color: sample Long01 texture pixels directly + check lighting color temp
2. [ ] Eyelash prominence: find material/alpha, reduce
3. [ ] Tie removal: check if separate mesh on toigo_female_suit_2, delete/mask fully
4. [ ] Shoulder fleck: new integration approach (rAF-based needsUpdate retrigger)
5. [ ] Skin tone: re-measure Delta-E vs reference, only change if evidence supports
6. [ ] Camera/background: screenshot-confirm only
7. [ ] Build avatar_v12.glb if needed, full regression, 4 screenshots, report

## CHECKPOINT 1 (hair color) - DONE
- Root cause: BOTH texture (sampled hue=15.1deg, copper-leaning) AND warm key light (0xfff2e6) compound.
- Fix: Lab-space hue rotation +13deg -> new hue 22.5deg (neutral brown), preserved L/chroma magnitude.
- File: phase20-scratch/long01_diffuse_recolored.png (not yet applied in build script)
- Next: wire into build_avatar_v12.py as the hair diffuse override, like prior phases' texture-swap pattern.

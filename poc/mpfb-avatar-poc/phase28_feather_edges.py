"""
Phase 28 Experiment A: feather the hard card silhouette edges of Long01's existing
recolored diffuse+alpha texture, WITHOUT touching the opaque core (preserves scalp
coverage). Uses scipy-free numpy distance-transform approximation (binary erosion
iterations) to find a border band near the alpha=1/alpha=0 boundary, then applies
noise-modulated partial transparency only in that band.

This does not touch geometry or the mesh at all -- texture-only experiment, isolated
and reversible (writes a new file, never overwrites phase20-textures/long01_diffuse_recolored.png).
"""
import bpy
import numpy as np

SRC = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase20-textures\long01_diffuse_recolored.png"
OUT = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase28-textures\long01_feathered_v2.png"

import os
os.makedirs(os.path.dirname(OUT), exist_ok=True)

img = bpy.data.images.load(SRC)
w, h = img.size
px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
alpha = px[:, :, 3].copy()
opaque_mask = alpha > 0.5

# Binary erosion by N pixels (4-connected, iterative) to find the "core" that's safely
# far from any edge -- anything NOT in eroded-core but still originally opaque is "near
# the edge" and is a candidate for feathering.
FEATHER_BAND_PX = 70  # v2: wider band, ~3.4% of 2048 -- v1 (18px) was invisible even zoomed into the raw texture
core = opaque_mask.copy()
for _ in range(FEATHER_BAND_PX):
    shifted = (
        np.roll(core, 1, axis=0) & np.roll(core, -1, axis=0) &
        np.roll(core, 1, axis=1) & np.roll(core, -1, axis=1) & core
    )
    core = shifted

edge_band = opaque_mask & ~core

# Within the edge band, apply fine-grained multiplicative noise to alpha to break the
# hard silhouette into a wispy, strand-like fringe -- mostly still fairly opaque near the
# core side, trailing to near-zero near the outer boundary. Use per-pixel random noise
# combined with a few sine-based "strand streak" frequencies along Y (since this hair is
# straight/vertical) so the fringe reads as directional strands, not uniform static.
rng = np.random.default_rng(28)
ys, xs = np.mgrid[0:h, 0:w]
streaks = (
    0.5 + 0.5 * np.sin(xs * 0.9 + rng.normal(0, 0.3, size=(1, w)))
) * (
    0.5 + 0.5 * np.sin(xs * 2.3 + 1.7)
)
noise = rng.uniform(0, 1, size=(h, w))
fringe_alpha_mult = np.clip(0.35 * streaks + 0.65 * noise, 0, 1) ** 1.4
# v2: push the falloff harder toward the outer edge of the band (distance-weighted),
# so the effect is clearly visible, not just statistically present.
dist_from_core = np.zeros((h, w), dtype=np.float32)
grow = opaque_mask.copy()
for i in range(FEATHER_BAND_PX):
    grow = (
        np.roll(grow, 1, axis=0) & np.roll(grow, -1, axis=0) &
        np.roll(grow, 1, axis=1) & np.roll(grow, -1, axis=1) & grow
    )
    newly_lost = (dist_from_core == 0) & edge_band & ~grow & opaque_mask
    dist_from_core[newly_lost] = (i + 1) / FEATHER_BAND_PX
outer_falloff = 1.0 - 0.75 * dist_from_core  # outer edge of band drops to 25% base alpha before noise
fringe_alpha_mult = fringe_alpha_mult * outer_falloff

new_alpha = alpha.copy()
new_alpha[edge_band] = alpha[edge_band] * fringe_alpha_mult[edge_band]

px[:, :, 3] = new_alpha

out_img = bpy.data.images.new("long01_feathered_v1", width=w, height=h, alpha=True)
out_img.pixels = px.flatten().tolist()
out_img.filepath_raw = OUT
out_img.file_format = 'PNG'
out_img.save()

edge_px = int(edge_band.sum())
total_opaque_px = int(opaque_mask.sum())
print(f"RESULT edge_band_px={edge_px} total_opaque_px={total_opaque_px} "
      f"edge_pct_of_opaque={100*edge_px/total_opaque_px:.2f}")
print(f"RESULT new_opaque_pct={100*np.mean(new_alpha>0.98):.2f} "
      f"new_transparent_pct={100*np.mean(new_alpha<0.05):.2f}")
print("WROTE", OUT)

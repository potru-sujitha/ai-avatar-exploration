"""
Phase 30: fix Phase 28's over-aggressive fixed-70px erosion (Phase 29 root cause:
~66% of opaque thin-strand regions were narrower than the 70px band on BOTH sides,
so their entire area -- not just the edge -- fell into the "feather" band and got
replaced with noise). scipy is NOT available in this Blender's Python (confirmed),
so distance-to-edge and the "local region thickness" used to make erosion
region-aware are both computed with plain numpy via iterative 4-connected
morphology (erosion to measure distance-to-edge, grayscale dilation/max-propagation
to measure local thickness), the same technique family Phase 28 already used.

Produces 4 candidate alpha textures for comparison:
  - fixed70  (reproduces Phase 28's original, as the known-bad reference point)
  - fixed25
  - fixed20
  - adaptive (region-aware: erosion radius per pixel capped at a safe fraction of
              that pixel's own local region half-width, so a thin region is never
              eroded past its own center)
"""
import bpy
import numpy as np
import os

SRC = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase20-textures\long01_diffuse_recolored.png"
OUTDIR = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase30-textures"
os.makedirs(OUTDIR, exist_ok=True)

img = bpy.data.images.load(SRC)
w, h = img.size
px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
alpha = px[:, :, 3].copy()
opaque_mask = alpha > 0.5
total_opaque = int(opaque_mask.sum())
print(f"BASELINE v12 opaque_pct={100*np.mean(alpha>0.98):.2f} "
      f"partial_pct={100*np.mean((alpha>0.02)&(alpha<0.98)):.2f} "
      f"transparent_pct={100*np.mean(alpha<0.02):.2f} total_opaque_px={total_opaque}")


def erode_step(mask):
    return (
        np.roll(mask, 1, axis=0) & np.roll(mask, -1, axis=0) &
        np.roll(mask, 1, axis=1) & np.roll(mask, -1, axis=1) & mask
    )


# --- 1) distance-to-edge (d_edge) for every opaque pixel, via iterative erosion,
#         recording the iteration at which each pixel first drops out of the
#         shrinking core. Capped at MAX_D; pixels that survive all MAX_D
#         iterations are "deep core" and get d_edge = MAX_D.
MAX_D = 90
d_edge = np.zeros((h, w), dtype=np.float32)
core = opaque_mask.copy()
for i in range(MAX_D):
    nxt = erode_step(core)
    newly_lost = core & ~nxt
    d_edge[newly_lost] = i + 1
    core = nxt
d_edge[core] = MAX_D  # deep interior that never eroded out

# --- 2) local region half-width estimate: grayscale dilation (iterative 4-neighbor
#         max) of d_edge, radius ~MAX_D. This spreads each region's own maximum
#         d_edge value (which occurs near that region's medial skeleton) outward,
#         so every pixel in a region "sees" that region's true half-width, not
#         just its own local distance-to-edge.
local_max_d = d_edge.copy()
field = d_edge.copy()
for _ in range(MAX_D):
    field = np.maximum.reduce([
        np.roll(field, 1, axis=0), np.roll(field, -1, axis=0),
        np.roll(field, 1, axis=1), np.roll(field, -1, axis=1), field,
    ])
    field = np.where(opaque_mask, field, 0)
local_max_d = field  # each opaque pixel now holds ~ its region's max d_edge

SAFE_FRACTION = 0.6  # never erode past 60% of the region's own half-width
thin_mask = opaque_mask & (local_max_d < 70)  # regions that Phase 28's fixed 70px fully consumed
thin_px = int(thin_mask.sum())
print(f"DIAG thin_region_px={thin_px} ({100*thin_px/total_opaque:.2f}% of opaque) "
      f"-- these are the regions Phase 28's fixed 70px erosion fully erased")


def make_candidate(name, adaptive_radius, seed=28):
    """adaptive_radius: either a scalar (fixed) or an (h,w) array (adaptive)."""
    edge_band = opaque_mask & (d_edge < adaptive_radius)
    rng = np.random.default_rng(seed)
    ys, xs = np.mgrid[0:h, 0:w]
    streaks = (
        0.5 + 0.5 * np.sin(xs * 0.9 + rng.normal(0, 0.3, size=(1, w)))
    ) * (
        0.5 + 0.5 * np.sin(xs * 2.3 + 1.7)
    )
    noise = rng.uniform(0, 1, size=(h, w))
    fringe_mult = np.clip(0.35 * streaks + 0.65 * noise, 0, 1) ** 1.4
    radius_arr = adaptive_radius if isinstance(adaptive_radius, np.ndarray) else np.full((h, w), adaptive_radius, dtype=np.float32)
    radius_safe = np.maximum(radius_arr, 1e-3)
    norm_dist = np.clip(d_edge / radius_safe, 0, 1)
    outer_falloff = 1.0 - 0.75 * (1.0 - norm_dist)
    fringe_mult = fringe_mult * outer_falloff

    new_alpha = alpha.copy()
    new_alpha[edge_band] = alpha[edge_band] * fringe_mult[edge_band]

    opaque_pct = 100 * np.mean(new_alpha > 0.98)
    partial_pct = 100 * np.mean((new_alpha > 0.02) & (new_alpha < 0.98))
    transparent_pct = 100 * np.mean(new_alpha < 0.02)
    thin_preserved_pct = 100 * np.mean(new_alpha[thin_mask] > 0.5) if thin_px else float('nan')
    print(f"CANDIDATE {name}: opaque_pct={opaque_pct:.2f} partial_pct={partial_pct:.2f} "
          f"transparent_pct={transparent_pct:.2f} thin_region_preserved_pct={thin_preserved_pct:.2f} "
          f"edge_band_px={int(edge_band.sum())}")

    out_px = px.copy()
    out_px[:, :, 3] = new_alpha
    out_img = bpy.data.images.new(f"long01_{name}", width=w, height=h, alpha=True)
    out_img.pixels = out_px.flatten().tolist()
    out_img.filepath_raw = os.path.join(OUTDIR, f"long01_{name}.png")
    out_img.file_format = 'PNG'
    out_img.save()
    print(f"WROTE {out_img.filepath_raw}")


make_candidate("fixed70", 70.0)
make_candidate("fixed25", 25.0)
make_candidate("fixed20", 20.0)
adaptive_radius_arr = np.minimum(70.0, SAFE_FRACTION * local_max_d).astype(np.float32)
make_candidate("adaptive", adaptive_radius_arr)

print("DONE")

import bpy
import numpy as np

ORIG = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase20-textures\long01_diffuse_recolored.png"
FEATHERED = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase28-textures\long01_feathered_v2.png"

def load_alpha(path):
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    return px[:, :, 3], w, h

a_orig, w, h = load_alpha(ORIG)
a_feat, w2, h2 = load_alpha(FEATHERED)
print("orig size", w, h, "feathered size", w2, h2)

opaque_orig = a_orig > 0.5
opaque_feat = a_feat > 0.5

# Find connected-ish islands crudely: for each row, find contiguous opaque runs, just to get a sense of island count/width.
# Simpler: find regions that were NOT opaque in orig but ARE now opaque/high in feathered (newly-visible regions)
newly_opaque = (~opaque_orig) & opaque_feat
newly_transparent = opaque_orig & (~opaque_feat)
print("newly_opaque_px", int(newly_opaque.sum()), "pct_of_texture", 100*newly_opaque.sum()/(w*h))
print("newly_transparent_px", int(newly_transparent.sum()), "pct_of_texture", 100*newly_transparent.sum()/(w*h))

# Locate bounding box of newly_opaque region (if any significant blob)
ys, xs = np.where(newly_opaque)
if len(ys) > 0:
    print("newly_opaque bbox: x", xs.min(), xs.max(), "y", ys.min(), ys.max())
    print("newly_opaque centroid approx:", xs.mean(), ys.mean())

# Also check: within originally-opaque-but-thin islands, did erosion consume entire thin regions?
# Measure: for original opaque mask, do a quick horizontal run-length check on a sample of rows
# to see distribution of island widths (to test "thin island fully eroded" hypothesis).
widths = []
for row in range(0, h, 20):
    line = opaque_orig[row]
    # find runs of True
    diff = np.diff(line.astype(int))
    starts = np.where(diff == 1)[0] + 1
    ends = np.where(diff == -1)[0] + 1
    if line[0]:
        starts = np.r_[0, starts]
    if line[-1]:
        ends = np.r_[ends, len(line)]
    for s, e in zip(starts, ends):
        widths.append(e - s)
if widths:
    widths = np.array(widths)
    print("orig opaque run-widths (sampled rows): min", widths.min(), "p10", np.percentile(widths,10), "median", np.median(widths), "count<140px", int((widths<140).sum()), "/", len(widths))

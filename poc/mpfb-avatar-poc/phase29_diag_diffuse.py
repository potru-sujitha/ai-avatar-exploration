import bpy
import numpy as np

ORIG = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase20-textures\long01_diffuse_recolored.png"
FEATHERED = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase28-textures\long01_feathered_v2.png"

def load(path):
    img = bpy.data.images.load(path)
    w, h = img.size
    return np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4), w, h

orig, w, h = load(ORIG)
feat, _, _ = load(FEATHERED)

alpha_orig = orig[:,:,3]
alpha_feat = feat[:,:,3]
rgb = orig[:,:,:3]  # diffuse color is same in both (only alpha differs per the script)

newly_transparent = (alpha_orig > 0.5) & (alpha_feat < 0.3)
ys, xs = np.where(newly_transparent)
print("newly_transparent region count:", len(ys))
if len(ys):
    sample_colors = rgb[ys, xs]
    print("mean RGB of newly-transparent-region pixels (the color UNDER where opacity dropped):", sample_colors.mean(axis=0))
    print("bbox: x", xs.min(), xs.max(), "y", ys.min(), ys.max())

# Compare to overall opaque-region mean color for context
opaque_all = alpha_orig > 0.5
print("mean RGB of all originally-opaque pixels:", rgb[opaque_all].mean(axis=0))

# khaki/pale check: khaki is roughly RGB (195,176,145)/255 = (0.76,0.69,0.57) normalized, fairly high R,G, lower B, desaturated

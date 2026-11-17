import bpy, array

paths = {
    "v12": r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase20-textures\long01_diffuse_recolored.png",
    "v17": r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase30-textures\long01_fixed20.png",
    "v18": r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase31-textures\long01_blend50.png",
}
imgs = {name: bpy.data.images.load(p) for name, p in paths.items()}
w, h = imgs["v12"].size
pix = {name: array.array('f', img.pixels[:]) for name, img in imgs.items()}

changed_12_17 = 0
changed_17_18 = 0
sample_coords_dark = []
sample_coords_alpha_diff = []

for y in range(0, h, 2):  # stride 2 for speed
    for x in range(0, w, 2):
        idx = (y * w + x) * 4
        a12 = pix["v12"][idx+3]
        a17 = pix["v17"][idx+3]
        a18 = pix["v18"][idx+3]
        r12, g12, b12 = pix["v12"][idx:idx+3]
        r17, g17, b17 = pix["v17"][idx:idx+3]
        r18, g18, b18 = pix["v18"][idx:idx+3]
        if abs(a12 - a17) > 0.02:
            changed_12_17 += 1
        if abs(a17 - a18) > 0.02:
            changed_17_18 += 1
        # Look for pixels that are opaque-ish but DARK (potential dark-band culprits)
        # specifically where alpha changed between v17 and v18 (the blend step)
        if abs(a17 - a18) > 0.05 and 0.15 < a18 < 0.95:
            lum18 = 0.3*r18 + 0.59*g18 + 0.11*b18
            if lum18 < 0.15 and len(sample_coords_dark) < 15:
                sample_coords_dark.append((x/w, y/h, round(a12,3), round(a17,3), round(a18,3), round(lum18,3)))

print("total sampled pixels:", (w//2)*(h//2))
print("changed alpha v12->v17:", changed_12_17)
print("changed alpha v17->v18:", changed_17_18)
print("\nDark+partial-alpha pixels where v17->v18 alpha changed (u, v, a12, a17, a18, luminance18):")
for c in sample_coords_dark:
    print(c)

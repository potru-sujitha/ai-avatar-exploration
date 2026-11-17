import bpy, array

SRC = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase13b-textures\WarmNeutralSkin.png"
OUT_DIR = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase38-textures"
import os
os.makedirs(OUT_DIR, exist_ok=True)

img = bpy.data.images.load(SRC)
w, h = img.size
pix = array.array('f', img.pixels[:])
print("size:", w, h)

def get(x, y):
    i = (y * w + x) * 4
    return pix[i], pix[i+1], pix[i+2], pix[i+3]

def set_px(out_pix, x, y, r, g, b, a):
    i = (y * w + x) * 4
    out_pix[i] = r; out_pix[i+1] = g; out_pix[i+2] = b; out_pix[i+3] = a

# Detect "stubble" pixels by local texture variance: stubble has high-frequency
# reddish-brown speckle; smooth skin is near-uniform. Sample a 3x3 neighborhood
# luminance variance -- stubble pixels have much higher local variance than
# smooth skin or the flat background fill.
import math
def luminance(r, g, b):
    return 0.3*r + 0.59*g + 0.11*b

# Bounding region to scan: the face/head island found visually around
# x in [1250, 2048], y in [1150, 1900] (Blender bottom-left origin) -- scan a
# bit wider to be safe and catch the full scalp extent.
X0, Y0, X1, Y1 = 1200, 1050, 2048, 2048

# First pass: compute local variance map for the region, find stubble mask
STEP = 1
variance_thresh = 0.0009  # tuned below by checking percentiles
coords_var = []
for y in range(Y0+2, Y1-2, STEP):
    for x in range(X0+2, X1-2, STEP):
        lums = []
        for dy in (-2, 0, 2):
            for dx in (-2, 0, 2):
                r, g, b, a = get(x+dx, y+dy)
                lums.append(luminance(r, g, b))
        mean = sum(lums) / len(lums)
        var = sum((l-mean)**2 for l in lums) / len(lums)
        coords_var.append(var)

coords_var.sort()
n = len(coords_var)
print("variance percentiles:")
for p in [50, 70, 80, 85, 90, 95]:
    print(f"  p{p}: {coords_var[int(n*p/100)]:.6f}")

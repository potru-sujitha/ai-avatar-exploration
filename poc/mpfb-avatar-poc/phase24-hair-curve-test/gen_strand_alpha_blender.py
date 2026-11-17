"""
Generate a real image-based vertical-fiber alpha/diffuse texture using Blender's
own image API (no PIL dependency needed). See gen_strand_alpha.py's docstring
for why this is required: Blender's glTF exporter cannot bake a pure-procedural
(Noise->ColorRamp) alpha graph, confirmed by reading the Phase 24 test's own
exported GLB JSON (alphaMode fell back to flat BLEND with zero texture).
"""
import bpy
import math
import random

random.seed(7)
W, H = 256, 512

img = bpy.data.images.new("StrandAlpha", width=W, height=H, alpha=True)
pixels = [0.0] * (W * H * 4)

base = (0.25, 0.16, 0.10)

N_STREAKS = 9
streaks = []
for i in range(N_STREAKS):
    cx = random.uniform(0.05, 0.95) * (W - 1)
    width = random.uniform(6, 16)
    strength = random.uniform(0.55, 1.0)
    jamp = random.uniform(2, 6)
    jfreq = random.uniform(0.01, 0.03)
    streaks.append((cx, width, strength, jamp, jfreq))

for y in range(H):
    v = y / (H - 1)
    tip_fade = max(0.0, 1.0 - max(0.0, v - 0.55) / 0.45)
    for x in range(W):
        a = 0.0
        for (cx, width, strength, jamp, jfreq) in streaks:
            cx_j = cx + jamp * math.sin(y * jfreq * 6.283 + cx)
            d = abs(x - cx_j)
            a = max(a, strength * max(0.0, 1.0 - d / width))
        a = min(1.0, a * tip_fade)
        rnd = random.uniform(-0.03, 0.03)
        idx = (y * W + x) * 4
        pixels[idx + 0] = max(0.0, min(1.0, base[0] + rnd))
        pixels[idx + 1] = max(0.0, min(1.0, base[1] + rnd))
        pixels[idx + 2] = max(0.0, min(1.0, base[2] + rnd))
        pixels[idx + 3] = a

img.pixels = pixels
out = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase24-hair-curve-test\strand_alpha.png"
img.filepath_raw = out
img.file_format = 'PNG'
img.save()
print("wrote", out, W, H)

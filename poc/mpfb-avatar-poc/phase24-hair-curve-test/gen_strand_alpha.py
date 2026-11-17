"""
Generate a real image-based vertical-fiber alpha/diffuse texture for the hair
ribbon material. The Phase 24 test fed Alpha from a procedural Noise->ColorRamp
node graph with no Image Texture node at all -- confirmed (by reading the
exported GLB's own material JSON) that Blender's glTF exporter cannot bake a
pure-procedural shader graph into an exportable alpha channel, so it silently
dropped the whole alpha setup and fell back to a flat alphaMode:BLEND with no
texture at all. The fix: author a real PNG so there's an actual Image Texture
node for the exporter to reference.
"""
from PIL import Image
import random

random.seed(7)
W, H = 256, 512  # V (0..1) runs along strand length; U across width
img = Image.new("RGBA", (W, H))
px = img.load()

base = (64, 41, 26)  # ~0.25,0.16,0.10 sRGB-ish medium brown, matches established color

# Build streak centers once, reused per row for coherent vertical fibers.
N_STREAKS = 9
streaks = []
for i in range(N_STREAKS):
    cx = random.uniform(0.05, 0.95) * (W - 1)
    width = random.uniform(6, 16)
    strength = random.uniform(0.55, 1.0)
    jitter_amp = random.uniform(2, 6)
    jitter_freq = random.uniform(0.01, 0.03)
    streaks.append((cx, width, strength, jitter_amp, jitter_freq))

for y in range(H):
    v = y / (H - 1)
    tip_fade = max(0.0, 1.0 - max(0.0, v - 0.55) / 0.45)
    for x in range(W):
        a = 0.0
        for (cx, width, strength, jamp, jfreq) in streaks:
            cx_j = cx + jamp * __import__("math").sin(y * jfreq * 6.283 + cx)
            d = abs(x - cx_j)
            a = max(a, strength * max(0.0, 1.0 - d / width))
        a *= tip_fade
        a = min(1.0, a)
        r = int(base[0] * (0.85 + 0.3 * random.uniform(-1, 1) * 0.1))
        g = int(base[1] * (0.85 + 0.3 * random.uniform(-1, 1) * 0.1))
        b = int(base[2] * (0.85 + 0.3 * random.uniform(-1, 1) * 0.1))
        px[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)), int(a * 255))

out = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase24-hair-curve-test\strand_alpha.png"
img.save(out)
print("wrote", out, img.size)

import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v18_candidate_v3.glb")
img = bpy.data.images.get("Fsuit2-spec")
pix = img.pixels[:]
w, h = img.size
from collections import Counter
green_counts = Counter()
total = w*h
step = 4  # sample stride for speed
for i in range(0, total, step):
    idx = i*4
    g = round(pix[idx+1], 3)
    green_counts[g] += 1
print("distinct green values (sampled every 4th pixel):", len(green_counts))
for val, cnt in sorted(green_counts.items(), key=lambda x: -x[1])[:10]:
    print(f"  green={val}  count={cnt}  ({100*cnt/ (total//step):.2f}%)")

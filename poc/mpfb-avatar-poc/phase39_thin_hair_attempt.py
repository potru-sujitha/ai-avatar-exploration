import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v18_candidate_v3.glb")
img = bpy.data.images.get("long01_masked_blend")
pix = list(img.pixels)
changed = 0
# Conservative: only soften pixels already in the semi-transparent mid-range (0.1-0.9).
# Leave fully opaque core strands (>0.9) and fully transparent gaps (<0.1) untouched entirely,
# to avoid reopening the bald-crown/hairline failure modes this exact texture has hit 6+ times.
for i in range(0, len(pix), 4):
    a = pix[i+3]
    if 0.1 < a < 0.9:
        pix[i+3] = a * 0.82
        changed += 1
img.pixels[:] = pix
img.filepath_raw = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase39-textures\long01_thinned_v1.png"
img.file_format = 'PNG'
img.save()
print(f"changed {changed} mid-alpha pixels (softened by 0.82x), saved thinned hair texture")

import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v18_candidate_v3.glb")
img = bpy.data.images.get("Fsuit2-spec")
pix = list(img.pixels)
w, h = img.size
changed = 0
for i in range(0, len(pix), 4):
    if pix[i+1] != 0.0:
        pix[i+1] = 0.0
        changed += 1
img.pixels[:] = pix
img.filepath_raw = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase39-textures\Fsuit2-spec_uniform.png"
img.file_format = 'PNG'
img.save()
print(f"changed {changed} pixels' green channel to 0.0, saved uniform spec map")

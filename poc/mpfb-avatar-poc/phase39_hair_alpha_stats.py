import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v18_candidate_v3.glb")
img = bpy.data.images.get("long01_masked_blend")
pix = img.pixels[:]
w, h = img.size
total = w*h
opaque = sum(1 for i in range(0, len(pix), 4*4) if pix[i+3] > 0.9)
transparent = sum(1 for i in range(0, len(pix), 4*4) if pix[i+3] < 0.1)
mid = (total//4) - opaque - transparent
print(f"size={w}x{h}, sampled every 4th px: opaque%={100*opaque/(total//4):.1f} transparent%={100*transparent/(total//4):.1f} mid%={100*mid/(total//4):.1f}")

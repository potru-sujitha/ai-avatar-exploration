import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v18_candidate_v3.glb")
img = bpy.data.images.get("Suit2NormNoTie_v2")
pix = img.pixels[:]
w,h = img.size
def sample(x,y):
    i=(y*w+x)*4
    return tuple(round(v,3) for v in (pix[i],pix[i+1],pix[i+2],pix[i+3]))
print("tie-region samples (normal map):")
for (x,y) in [(1700,1850),(1750,1900),(1800,1950),(1650,1820)]:
    print(f"  ({x},{y}):", sample(x,y))
print("neutral-normal reference (flat jacket elsewhere, e.g. 1700,100):", sample(1700,100))

import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v7.blend")
print("ALL MATERIALS:")
for m in sorted(bpy.data.materials, key=lambda x: x.name):
    print(" -", m.name)

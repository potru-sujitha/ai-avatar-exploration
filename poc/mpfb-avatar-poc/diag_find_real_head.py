import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v11.blend")
for obj in bpy.data.objects:
    if obj.type == 'MESH' and obj.name.endswith('_export_copy'):
        print(f"{obj.name}: verts={len(obj.data.vertices)}")

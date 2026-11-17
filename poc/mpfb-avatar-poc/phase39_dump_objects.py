import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        print("OBJECT:", obj.name, "| mesh:", obj.data.name, "| verts:", len(obj.data.vertices), "| materials:", [s.material.name if s.material else None for s in obj.material_slots])

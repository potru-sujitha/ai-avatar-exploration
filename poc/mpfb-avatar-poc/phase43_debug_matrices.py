import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")
body = bpy.data.objects["Human_export_copy"]
suit = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
print("body matrix_world:", body.matrix_world)
print("suit matrix_world:", suit.matrix_world)
print("body parent:", body.parent)
print("body dimensions/bound_box corners (local):", [tuple(c) for c in body.bound_box])

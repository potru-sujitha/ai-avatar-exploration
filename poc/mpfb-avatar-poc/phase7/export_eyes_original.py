import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v5.blend")
arm = bpy.data.objects.get("Human.rig_export_copy")
eyes_obj = bpy.data.objects.get("Human.high-poly_export_copy")
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
eyes_obj.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(
    filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase7_out\eyes_original_test.glb",
    export_format='GLB', use_selection=True, export_animations=False,
)
print("exported eyes_original_test.glb")

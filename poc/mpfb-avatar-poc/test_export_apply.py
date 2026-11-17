import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy.blend")

bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
    if o.name.endswith('_export_copy') and o.type in ('MESH', 'ARMATURE'):
        o.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_test_restpose_false.glb",
    export_format='GLB',
    use_selection=True,
    export_animations=False,
    export_rest_position_armature=False,
)
print("exported with export_rest_position_armature=False")

import bpy

bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy.blend")

arm = bpy.data.objects["Human.rig_export_copy"]

fixed = []
for matname, threshold in [("Human.female_elegantsuit01", 0.5), ("Human.teeth_base", 0.4), ("Human.tongue01", 0.4)]:
    mat = bpy.data.materials.get(matname)
    if mat:
        mat.blend_method = 'CLIP'
        mat.alpha_threshold = threshold
        fixed.append((matname, mat.blend_method, mat.alpha_threshold))
print("FIXED MATERIALS:", fixed)

def export_isolated(mesh_names, out_path):
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    for n in mesh_names:
        obj = bpy.data.objects.get(n)
        if obj:
            obj.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', use_selection=True, export_animations=False)
    print("exported", out_path)

export_isolated(["Human.female_elegantsuit01_export_copy"], r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase3-defect-investigation\fixed_suit.glb")
export_isolated(["Human.teeth_base_export_copy", "Human.tongue01_export_copy"], r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase3-defect-investigation\fixed_mouth.glb")
print("DONE FIX TEST EXPORT")

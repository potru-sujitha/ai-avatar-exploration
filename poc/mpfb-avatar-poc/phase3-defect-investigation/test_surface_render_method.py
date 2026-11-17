import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy.blend")

arm = bpy.data.objects["Human.rig_export_copy"]
mat = bpy.data.materials.get("Human.female_elegantsuit01")

items = type(mat).bl_rna.properties['surface_render_method'].enum_items
print("valid surface_render_method values:", [i.identifier for i in items])

for matname in ["Human.female_elegantsuit01", "Human.teeth_base", "Human.tongue01"]:
    m = bpy.data.materials.get(matname)
    m.surface_render_method = 'BLENDED'
    print(matname, "-> surface_render_method now:", m.surface_render_method)

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

export_isolated(["Human.female_elegantsuit01_export_copy"], r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase3-defect-investigation\srm_blended_suit.glb")
export_isolated(["Human.teeth_base_export_copy", "Human.tongue01_export_copy"], r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase3-defect-investigation\srm_blended_mouth.glb")

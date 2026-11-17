import bpy

bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy.blend")

arm = bpy.data.objects["Human.rig_export_copy"]

def export_isolated(mesh_names, out_path):
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    for n in mesh_names:
        obj = bpy.data.objects.get(n)
        if obj is None:
            print("MISSING", n)
            continue
        obj.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format='GLB',
        use_selection=True,
        export_animations=False,
    )
    print("exported", out_path, "with", mesh_names)

# Experiment A: suit alone (+ armature, required for skin)
export_isolated(
    ["Human.female_elegantsuit01_export_copy"],
    r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase3-defect-investigation\minimal_suit.glb"
)

# Experiment B: teeth + tongue alone (+ armature)
export_isolated(
    ["Human.teeth_base_export_copy", "Human.tongue01_export_copy"],
    r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase3-defect-investigation\minimal_mouth.glb"
)

# Experiment C: body alone, for a clean baseline comparison (known-good per phase 1/2 testing)
export_isolated(
    ["Human_export_copy"],
    r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase3-defect-investigation\minimal_body.glb"
)
print("ALL EXPORTS DONE")

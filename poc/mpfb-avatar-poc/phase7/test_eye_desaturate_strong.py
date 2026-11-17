import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v5.blend")
mat = bpy.data.materials.get("Human.high-poly")
nt = mat.node_tree
bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
hsv = nt.nodes.new('ShaderNodeHueSaturation')
hsv.inputs['Saturation'].default_value = 0.25
link = bsdf.inputs['Base Color'].links[0]
src = link.from_socket
nt.links.remove(link)
nt.links.new(src, hsv.inputs['Color'])
nt.links.new(hsv.outputs['Color'], bsdf.inputs['Base Color'])

arm = bpy.data.objects.get("Human.rig_export_copy")
eyes_obj = bpy.data.objects.get("Human.high-poly_export_copy")
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
eyes_obj.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(
    filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase7\eyes_strong_desat.glb",
    export_format='GLB', use_selection=True, export_animations=False,
)
print("exported eyes_strong_desat.glb")

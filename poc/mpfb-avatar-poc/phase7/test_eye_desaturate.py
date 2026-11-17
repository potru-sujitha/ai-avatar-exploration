import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v5.blend")

mat = bpy.data.materials.get("Human.high-poly")
nt = mat.node_tree
bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
mix_node = nt.nodes.get("diffuseIntensity")
print("mix node found:", mix_node)

# Insert a Hue/Saturation/Value node between diffuseIntensity's output and BSDF Base Color,
# reducing saturation specifically (targets the sclera's visible red veins without
# flattening the iris detail entirely -- the iris itself is naturally warm/brown, not harmed
# much by a moderate saturation reduction on the whole texture since it's mostly dark already).
hsv = nt.nodes.new('ShaderNodeHueSaturation')
hsv.label = "EyeRednessReduce_Phase7"
hsv.inputs['Saturation'].default_value = 0.55
hsv.inputs['Value'].default_value = 1.0
hsv.inputs['Hue'].default_value = 0.5

base_color_link = bsdf.inputs['Base Color'].links[0]
src_socket = base_color_link.from_socket
nt.links.remove(base_color_link)
nt.links.new(src_socket, hsv.inputs['Color'])
nt.links.new(hsv.outputs['Color'], bsdf.inputs['Base Color'])
print("inserted desaturation node")

# Export just the eyes mesh in isolation for a quick visual test
arm = bpy.data.objects.get("Human.rig_export_copy")
eyes_obj = bpy.data.objects.get("Human.high-poly_export_copy")
print("eyes export-copy object:", eyes_obj)
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
eyes_obj.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.export_scene.gltf(
    filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase7_out\eyes_desaturated_test.glb",
    export_format='GLB', use_selection=True, export_animations=False,
)
print("exported eyes_desaturated_test.glb")

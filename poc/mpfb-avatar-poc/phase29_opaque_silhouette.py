import bpy, math

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v12.glb")

hair = bpy.data.objects.get("Human.long01_export_copy")
mat = bpy.data.materials.get("Human.long01")
bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)

# Force full opacity: disconnect alpha input, set base color to a bright flat debug color
alpha_input = bsdf.inputs.get('Alpha')
if alpha_input.is_linked:
    for link in list(mat.node_tree.links):
        if link.to_socket == alpha_input:
            mat.node_tree.links.remove(link)
alpha_input.default_value = 1.0
mat.blend_method = 'OPAQUE'
bsdf.inputs['Base Color'].default_value = (1.0, 0.2, 0.8, 1.0)  # bright magenta, unmistakable
base_color_input = bsdf.inputs['Base Color']
for link in list(mat.node_tree.links):
    if link.to_socket == base_color_input:
        mat.node_tree.links.remove(link)

# Set up a simple top-down camera + light
scene = bpy.context.scene
cam_data = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
cam.location = (0, 0.1, 1.7)
cam.rotation_euler = (0, 0, 0)  # pointing -Z after a tweak below
cam.rotation_euler = (math.radians(180), 0, 0)  # look straight down? need -Z forward; use track
scene.camera = cam

light_data = bpy.data.lights.new("sun", type='SUN')
light_data.energy = 3
light = bpy.data.objects.new("sun", light_data)
scene.collection.objects.link(light)
light.location = (0,0,3)

# aim camera straight down at hair bbox center using a simple approach: point -Z
cam.rotation_euler = (0,0,0)
cam.location = (0, -0.02, 2.2)
cam.rotation_euler = (math.radians(-90)*0 , 0, 0)
# Use track-to constraint to point at the head top reliably
target = bpy.data.objects.new("target", None)
scene.collection.objects.link(target)
target.location = (0, -0.02, 1.4)
con = cam.constraints.new('TRACK_TO')
con.target = target
con.track_axis = 'TRACK_NEGATIVE_Z'
con.up_axis = 'UP_Y'

scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 500
scene.render.resolution_y = 500
scene.render.filepath = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase29_opaque_silhouette_top.png"
bpy.ops.render.render(write_still=True)
print("DONE render")

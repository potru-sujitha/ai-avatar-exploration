import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")

clay = bpy.data.materials.new("ClayGrey")
clay.use_nodes = True
bsdf = clay.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Base Color"].default_value = (0.65, 0.65, 0.65, 1.0)
bsdf.inputs["Roughness"].default_value = 0.6

for obj in bpy.data.objects:
    if obj.type == 'MESH':
        obj.data.materials.clear()
        obj.data.materials.append(clay)

cam_data = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_data)
bpy.context.scene.collection.objects.link(cam)
# tight close-up on the chest/collar/tie region, roughly matching the established front-close framing
cam.location = (0, -0.38, 1.38)
cam.rotation_euler = (1.5708, 0, 0)
cam_data.lens = 85
bpy.context.scene.camera = cam

key = bpy.data.lights.new("key", type='SUN')
key.energy = 2.5
keyobj = bpy.data.objects.new("key", key)
keyobj.location = (0.3, -0.6, 1.8)
keyobj.rotation_euler = (0.9, 0, 0.4)
bpy.context.scene.collection.objects.link(keyobj)

fill = bpy.data.lights.new("fill", type='SUN')
fill.energy = 1.2
fillobj = bpy.data.objects.new("fill", fill)
fillobj.location = (-0.3, -0.6, 1.2)
fillobj.rotation_euler = (2.2, 0, -0.4)
bpy.context.scene.collection.objects.link(fillobj)

scene = bpy.context.scene
try:
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
except TypeError:
    scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 800
scene.render.resolution_y = 800
scene.render.filepath = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase43_clay_baseline.png"
bpy.ops.render.render(write_still=True)
print("rendered clay baseline")

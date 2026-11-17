import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase40_test3_flattened.glb")

clay = bpy.data.materials.new("ClayGrey")
clay.use_nodes = True
bsdf = clay.node_tree.nodes.get("Principled BSDF")
if bsdf:
    bsdf.inputs["Base Color"].default_value = (0.6, 0.6, 0.6, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.5

for obj in bpy.data.objects:
    if obj.type == 'MESH':
        obj.data.materials.clear()
        obj.data.materials.append(clay)

cam_data = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_data)
bpy.context.scene.collection.objects.link(cam)
cam.location = (0, -0.8, 1.35)
cam.rotation_euler = (1.4, 0, 0)
cam_data.lens = 70
bpy.context.scene.camera = cam

light_data = bpy.data.lights.new("sun", type='SUN')
light_data.energy = 3.0
light = bpy.data.objects.new("sun", light_data)
light.location = (0.5, -1, 2)
light.rotation_euler = (0.9, 0, 0.5)
bpy.context.scene.collection.objects.link(light)

scene = bpy.context.scene
try:
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
except TypeError:
    scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 600
scene.render.resolution_y = 600
scene.render.filepath = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase40_clay_after.png"
bpy.ops.render.render(write_still=True)
print("rendered clay check")

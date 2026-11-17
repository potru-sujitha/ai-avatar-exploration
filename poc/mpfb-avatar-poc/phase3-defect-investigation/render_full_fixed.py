import bpy, sys
glb_path = sys.argv[sys.argv.index("--") + 1]
png_path = sys.argv[sys.argv.index("--") + 2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb_path)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 700
scene.render.resolution_y = 900
scene.render.filepath = png_path
scene.render.image_settings.file_format = 'PNG'
cam_data = bpy.data.cameras.new("Cam")
cam_obj = bpy.data.objects.new("Cam", cam_data)
bpy.context.collection.objects.link(cam_obj)
cam_obj.location = (0, -2.2, 1.55)
cam_obj.rotation_euler = (1.4835, 0, 0)
scene.camera = cam_obj
for name, loc, energy in [("K",(1,-2,2.5),800),("F",(-1.5,-1,2),300)]:
    ld = bpy.data.lights.new(name, type='POINT')
    ld.energy = energy
    lo = bpy.data.objects.new(name, ld)
    lo.location = loc
    bpy.context.collection.objects.link(lo)
bpy.ops.render.render(write_still=True)
print("RENDERED", png_path)

import bpy

# Start from a totally fresh scene (not the MPFB-loaded one) to avoid any MPFB state bleeding in.
bpy.ops.wm.read_factory_settings(use_empty=True)

bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v2.glb")

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 700
scene.render.resolution_y = 900
scene.render.filepath = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\reimported_glb_render.png"
scene.render.image_settings.file_format = 'PNG'

cam_data = bpy.data.cameras.new("ReimportCam")
cam_obj = bpy.data.objects.new("ReimportCam", cam_data)
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

print("objects after import:", [o.name for o in bpy.data.objects if o.type == 'MESH'][:20])
bpy.ops.render.render(write_still=True)
print("RENDERED reimported GLB")

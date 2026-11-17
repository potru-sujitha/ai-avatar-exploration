import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy.blend")

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 700
scene.render.resolution_y = 900
scene.render.filepath = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\stage3_blender_render.png"
scene.render.image_settings.file_format = 'PNG'

# Find the export-copy armature/body to frame the camera on its head
body = bpy.data.objects.get("Human_export_copy")
print("body found:", body, "loc:", body.location if body else None)

cam_data = bpy.data.cameras.new("DiagCam3")
cam_obj = bpy.data.objects.new("DiagCam3", cam_data)
bpy.context.collection.objects.link(cam_obj)
cam_obj.location = (0, -2.2, 1.55)
cam_obj.rotation_euler = (1.4835, 0, 0)
scene.camera = cam_obj

for name, loc, energy in [("KeyLight3",(1,-2,2.5),800),("FillLight3",(-1.5,-1,2),300)]:
    light_data = bpy.data.lights.new(name, type='POINT')
    light_data.energy = energy
    light_obj = bpy.data.objects.new(name, light_data)
    light_obj.location = loc
    bpy.context.collection.objects.link(light_obj)

bpy.ops.render.render(write_still=True)
print("RENDERED stage3 export-copy check image")

print("\n=== export-copy mesh objects, visibility + hide states ===")
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name.endswith('_export_copy'):
        print(f"  {o.name}: hide_viewport={o.hide_viewport}, hide_render={o.hide_render}, hide_get={o.hide_get()}")

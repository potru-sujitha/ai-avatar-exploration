import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage2.blend")

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 700
scene.render.resolution_y = 900
scene.render.filepath = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\stage2_blender_render.png"
scene.render.image_settings.file_format = 'PNG'

# Add a camera pointed at the head/upper body if none exists or reuse default
cam_data = bpy.data.cameras.new("DiagCam")
cam_obj = bpy.data.objects.new("DiagCam", cam_data)
bpy.context.collection.objects.link(cam_obj)
cam_obj.location = (0, -2.2, 1.55)
cam_obj.rotation_euler = (1.4835, 0, 0)  # looking roughly forward at head height
scene.camera = cam_obj

# Basic 3-point-ish lighting so render isn't pitch black
for name, loc, energy in [("KeyLight",(1,-2,2.5),800),("FillLight",(-1.5,-1,2),300)]:
    light_data = bpy.data.lights.new(name, type='POINT')
    light_data.energy = energy
    light_obj = bpy.data.objects.new(name, light_data)
    light_obj.location = loc
    bpy.context.collection.objects.link(light_obj)

bpy.ops.render.render(write_still=True)
print("RENDERED stage2 check image")

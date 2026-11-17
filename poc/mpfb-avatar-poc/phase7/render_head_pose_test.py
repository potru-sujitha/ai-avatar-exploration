import bpy, math, sys

bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v4.blend")

angle_deg = float(sys.argv[sys.argv.index('--')+1])
out_path = sys.argv[sys.argv.index('--')+2]

arm = bpy.data.objects.get("Human.rig_export_copy")
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')
head_pb = arm.pose.bones.get("Head")
head_pb.rotation_mode = 'XYZ'
head_pb.rotation_euler = (math.radians(angle_deg), 0, 0)
bpy.ops.object.mode_set(mode='OBJECT')

scene = bpy.context.scene
cam_data = bpy.data.cameras.new("TestCam")
cam_obj = bpy.data.objects.new("TestCam", cam_data)
scene.collection.objects.link(cam_obj)
cam_obj.location = (0, -0.9, 1.52)
cam_obj.rotation_euler = (math.radians(90), 0, 0)
cam_data.lens = 85
scene.camera = cam_obj

sun = bpy.data.lights.new("TestSun", 'SUN')
sun_obj = bpy.data.objects.new("TestSun", sun)
scene.collection.objects.link(sun_obj)
sun_obj.rotation_euler = (math.radians(60), 0, math.radians(30))
sun.energy = 3

scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 500
scene.render.resolution_y = 500
scene.render.filepath = out_path
bpy.ops.render.render(write_still=True)
print("rendered", out_path)

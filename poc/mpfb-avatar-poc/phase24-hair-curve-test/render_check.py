import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase24-hair-curve-test\phase24_haircurve_test.blend")

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 700
scene.render.resolution_y = 700
scene.render.filepath = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase24-hair-curve-test\blender_viewport_check.png"

# Simple camera + light pointed at the hair mesh area
hair_obj = bpy.data.objects.get("TestHairCardMesh")
import mathutils
cam_data = bpy.data.cameras.new("TestCam")
cam_obj = bpy.data.objects.new("TestCam", cam_data)
bpy.context.collection.objects.link(cam_obj)
cam_obj.location = (0, -0.9, 1.45)
cam_obj.rotation_euler = (1.4, 0, 0)
scene.camera = cam_obj

light_data = bpy.data.lights.new("TestLight", type='SUN')
light_data.energy = 3
light_obj = bpy.data.objects.new("TestLight", light_data)
light_obj.location = (0, -1, 2)
light_obj.rotation_euler = (0.6, 0, 0.3)
bpy.context.collection.objects.link(light_obj)

bpy.ops.render.render(write_still=True)
print("RENDERED")

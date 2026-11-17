import bpy, math, mathutils
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v4.blend")
arm = bpy.data.objects.get("Human.rig_export_copy")
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
for bn in ["LeftEye", "RightEye"]:
    b = arm.data.edit_bones.get(bn)
    print(f"\n{bn}: head={b.head}, tail={b.tail}, roll={b.roll}")
    print("  matrix:\n", b.matrix)
bpy.ops.object.mode_set(mode='POSE')
for bn in ["LeftEye", "RightEye"]:
    pb = arm.pose.bones.get(bn)
    print(f"\n{bn} pose: rotation_quaternion={pb.rotation_quaternion}, mode={pb.rotation_mode}")
bpy.ops.object.mode_set(mode='OBJECT')

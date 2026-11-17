import bpy, math
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v4.blend")

arm = bpy.data.objects.get("Human.rig_export_copy")
print("armature object:", arm)
print("armature world matrix:\n", arm.matrix_world)
print("armature rotation_euler:", arm.rotation_euler)
print("armature rotation_quaternion:", arm.rotation_quaternion)
print("armature rotation_mode:", arm.rotation_mode)

bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
head = arm.data.edit_bones.get("Head")
neck = arm.data.edit_bones.get("Neck")
print("\nHead edit bone:")
if head:
    print("  head/tail:", head.head, head.tail)
    print("  roll:", head.roll)
    print("  matrix:\n", head.matrix)
    print("  parent:", head.parent.name if head.parent else None)
if neck:
    print("\nNeck edit bone:")
    print("  head/tail:", neck.head, neck.tail)
    print("  roll:", neck.roll)

bpy.ops.object.mode_set(mode='POSE')
head_pose = arm.pose.bones.get("Head")
print("\nHead pose bone:")
print("  rotation_mode:", head_pose.rotation_mode)
print("  rotation_quaternion:", head_pose.rotation_quaternion)
print("  rotation_euler:", head_pose.rotation_euler)
print("  matrix_basis:\n", head_pose.matrix_basis)
print("  matrix (pose space):\n", head_pose.matrix)

bpy.ops.object.mode_set(mode='OBJECT')

import bpy, math
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage2_v4.blend")

arm = None
for o in bpy.data.objects:
    if o.type == 'ARMATURE':
        arm = o
        break
print("armature object (pre-export):", arm.name if arm else None)

bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
head = arm.data.edit_bones.get("Head")
neck = arm.data.edit_bones.get("Neck")
print("Head matrix (pre-export):\n", head.matrix)
print("Head roll:", head.roll)
print("Neck matrix (pre-export):\n", neck.matrix)
bpy.ops.object.mode_set(mode='OBJECT')

# Compute tilt angle: local Z axis vs world -Y
import mathutils
m = head.matrix
z_axis = mathutils.Vector((m[0][2], m[1][2], m[2][2]))
print("Head local Z axis (world space):", z_axis)
target = mathutils.Vector((0, -1, 0))
angle = math.degrees(z_axis.angle(target))
print("angle between Head local Z and world -Y (deg):", angle)

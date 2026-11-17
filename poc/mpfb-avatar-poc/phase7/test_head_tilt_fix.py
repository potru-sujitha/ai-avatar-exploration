import bpy, math, mathutils
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v4.blend")

arm = bpy.data.objects.get("Human.rig_export_copy")
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
head = arm.data.edit_bones.get("Head")

print("BEFORE head matrix:\n", head.matrix)
z_before = mathutils.Vector((head.matrix[0][2], head.matrix[1][2], head.matrix[2][2]))
print("BEFORE local Z:", z_before, "angle from -Y:", math.degrees(z_before.angle(mathutils.Vector((0,-1,0)))))

# Rotate the Head bone around its own local X axis, pivoting at its head (root) point,
# by the angle needed to zero out the forward tilt. Try +4.343 deg first.
import sys
angle_deg = float(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else 4.343
angle = math.radians(angle_deg)
x_axis = mathutils.Vector((head.matrix[0][0], head.matrix[1][0], head.matrix[2][0]))
pivot = head.head.copy()
rot = mathutils.Matrix.Rotation(angle, 4, x_axis)

def rotate_point(p):
    return pivot + (rot @ (p - pivot))

head.tail = rotate_point(head.tail)
head.roll = head.roll  # keep roll; tail move changes orientation naturally for a bone pointing head->tail
# also rotate roll reference if needed -- recompute via matrix after moving tail
print("\nAFTER tail move, head matrix:\n", head.matrix)
z_after = mathutils.Vector((head.matrix[0][2], head.matrix[1][2], head.matrix[2][2]))
print("AFTER local Z:", z_after, "angle from -Y:", math.degrees(z_after.angle(mathutils.Vector((0,-1,0)))))

bpy.ops.object.mode_set(mode='OBJECT')

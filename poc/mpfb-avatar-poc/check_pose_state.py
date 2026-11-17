import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy.blend")

arm = bpy.data.objects["Human.rig_export_copy"]
print("armature object rotation_quaternion:", arm.rotation_quaternion)
print("armature object rotation_euler:", arm.rotation_euler)
print("armature object scale:", arm.scale)
print("armature object matrix_world:\n", arm.matrix_world)

nonidentity = []
for pb in arm.pose.bones:
    import mathutils
    if pb.matrix_basis != mathutils.Matrix.Identity(4):
        loc = pb.location
        rot = pb.rotation_quaternion if pb.rotation_mode == 'QUATERNION' else None
        if loc.length > 0.0001 or (rot and (abs(rot.w - 1.0) > 0.0001 or rot.x != 0 or rot.y != 0 or rot.z != 0)):
            nonidentity.append((pb.name, tuple(loc), tuple(rot) if rot else None))

print(f"\npose bones with non-identity pose transform: {len(nonidentity)}")
for n in nonidentity[:20]:
    print(" ", n)

# Check specifically Head and Jaw and a body bone
for name in ["Head", "Jaw", "Spine", "Hips"]:
    pb = arm.pose.bones.get(name)
    if pb:
        print(f"\n{name} pose: loc={tuple(pb.location)}, rot_quat={tuple(pb.rotation_quaternion)}, rot_mode={pb.rotation_mode}")
        eb = arm.data.bones.get(name)
        print(f"{name} data.bones matrix_local:\n{eb.matrix_local}")

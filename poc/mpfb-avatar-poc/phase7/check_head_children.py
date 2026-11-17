import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v4.blend")
arm = bpy.data.objects.get("Human.rig_export_copy")
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
head = arm.data.edit_bones.get("Head")
print("Head children:", [c.name for c in head.children])
for c in head.children:
    print(f"  {c.name}: use_connect={c.use_connect}, head={c.head}, tail={c.tail}")
bpy.ops.object.mode_set(mode='OBJECT')

import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy.blend")

for o in bpy.data.objects:
    if o.type != 'MESH' or not o.name.endswith('_export_copy'):
        continue
    has_jaw = any(g.name == 'Jaw' for g in o.vertex_groups)
    if has_jaw:
        jaw_idx = [g.index for g in o.vertex_groups if g.name == 'Jaw'][0]
        n = sum(1 for v in o.data.vertices for g in v.groups if g.group == jaw_idx and g.weight > 0.0001)
        print(f"{o.name}: HAS Jaw group, {n}/{len(o.data.vertices)} verts weighted to it")
    else:
        print(f"{o.name}: no Jaw group")

# Also check the armature itself -- is Jaw actually a bone that TalkingHead would ever rotate?
arm = bpy.data.objects["Human.rig_export_copy"]
jaw_bone = arm.data.bones.get("Jaw")
print("\nJaw bone parent:", jaw_bone.parent.name if jaw_bone and jaw_bone.parent else None)
print("Jaw bone children:", [b.name for b in jaw_bone.children] if jaw_bone else None)

import bpy
from collections import Counter
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy.blend")

teeth = bpy.data.objects["Human.teeth_base_export_copy"]
vgroups = {g.index: g.name for g in teeth.vertex_groups}
print("teeth vertex groups:", list(vgroups.values()))

bone_counter = Counter()
sample_lines = []
for v in teeth.data.vertices[:3868]:
    weights = [(vgroups[g.group], g.weight) for g in v.groups if g.weight > 0.0001]
    for name, w in weights:
        bone_counter[name] += 1
    if len(sample_lines) < 15:
        sample_lines.append((v.index, weights))

print("\nbone usage across all teeth vertices:", dict(bone_counter))
print("\nsample vertex weights (first 15):")
for idx, weights in sample_lines:
    print(f"  v{idx}: {weights}")

# Also check the armature's actual bone names to confirm these are real/sensible bones
arm = bpy.data.objects["Human.rig_export_copy"]
print("\narmature bone names (first 40):", [b.name for b in arm.data.bones][:40])
print("total bones:", len(arm.data.bones))
print("'Head' in bones:", 'Head' in [b.name for b in arm.data.bones])
print("any 'jaw' in bones (case-insens):", [b.name for b in arm.data.bones if 'jaw' in b.name.lower()])

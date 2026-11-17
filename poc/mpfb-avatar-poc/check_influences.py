import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy.blend")

for o in bpy.data.objects:
    if o.type != 'MESH' or not o.name.endswith('_export_copy'):
        continue
    max_influences = 0
    over4_count = 0
    total_verts = len(o.data.vertices)
    for v in o.data.vertices:
        n = sum(1 for g in v.groups if g.weight > 0.0001)
        if n > max_influences:
            max_influences = n
        if n > 4:
            over4_count += 1
    print(f"{o.name}: verts={total_verts}, max_influences={max_influences}, verts_over_4={over4_count} ({100*over4_count/total_verts:.1f}%)")

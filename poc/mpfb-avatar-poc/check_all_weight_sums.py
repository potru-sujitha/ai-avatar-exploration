import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy.blend")

for o in bpy.data.objects:
    if o.type != 'MESH' or not o.name.endswith('_export_copy'):
        continue
    bad = 0
    total = len(o.data.vertices)
    max_sum = 0
    min_sum = 999
    for v in o.data.vertices:
        s = sum(g.weight for g in v.groups if g.weight > 0.0001)
        if s > 0:
            max_sum = max(max_sum, s)
            min_sum = min(min_sum, s)
            if abs(s - 1.0) > 0.01:
                bad += 1
    print(f"{o.name}: verts={total}, bad_sum_count={bad} ({100*bad/total:.1f}%), min_sum={min_sum:.3f}, max_sum={max_sum:.3f}")

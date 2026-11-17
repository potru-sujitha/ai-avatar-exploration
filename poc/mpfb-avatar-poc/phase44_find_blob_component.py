import bpy, bmesh, mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")
suit = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
mesh = suit.data

bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()

visited = {}
components = []
for v0 in bm.verts:
    if v0 in visited:
        continue
    comp_id = len(components)
    comp = {v0}
    stack = [v0]
    while stack:
        v = stack.pop()
        for e in v.link_edges:
            o = e.other_vert(v)
            if o not in comp:
                comp.add(o)
                stack.append(o)
    for v in comp:
        visited[v] = comp_id
    components.append(comp)

# Narrow region covering exactly the visible rounded blob in the render (central column, the
# height band between the collar point and where the red strip begins).
region_min = mathutils.Vector((-0.025, -0.20, 1.27))
region_max = mathutils.Vector((0.025, -0.03, 1.35))
def in_region(v):
    w = suit.matrix_world @ v.co
    return all(region_min[k] <= w[k] <= region_max[k] for k in range(3))

cands = [(v, suit.matrix_world @ v.co) for v in bm.verts if in_region(v)]
cands.sort(key=lambda t: t[1].y)  # most negative y = most forward/toward camera
print("candidates in blob region, most-forward 25:")
for v, w in cands[:25]:
    cid = visited[v]
    print(f"  idx={v.index} pos={tuple(round(c,4) for c in w)} comp_id={cid} comp_size={len(components[cid])}")

# Tally which components dominate the most-forward (smallest-y) half of this region.
from collections import Counter
forward_half = cands[:max(1, len(cands)//3)]
tally = Counter(visited[v] for v, w in forward_half)
print("\ncomponent tally among most-forward third of blob region:", tally)
for cid, cnt in tally.most_common():
    print(f"  comp_id={cid} count_in_region={cnt} total_comp_size={len(components[cid])}")

bm.free()

import bpy, bmesh, mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")
suit = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
mesh = suit.data

bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()

# Compute ALL connected components once (edge-connectivity across whole mesh).
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
print("total components:", len(components))

# The visible rounded knot BLOB sits right at the collar point, roughly z~1.30-1.34 (just below
# where Phase 43's narrow-column top-bulge verts were centered: idx 1848 etc at y=-0.1399 z~1.22,
# which turned out (per the render) to belong to the flat blade/strip, not the rounded blob above it).
# Scan a slightly higher/more-forward sub-region for the blob's own most-forward vertex.
region_min = mathutils.Vector((-0.04, -0.20, 1.26))
region_max = mathutils.Vector((0.04, -0.03, 1.40))
def in_region(v):
    w = suit.matrix_world @ v.co
    return all(region_min[k] <= w[k] <= region_max[k] for k in range(3))

cands = [v for v in bm.verts if in_region(v)]
print("candidates in blob-search region:", len(cands))

# local bulge (same 2-ring method as Phase 43)
bulges = []
for v in cands:
    r1 = [e.other_vert(v) for e in v.link_edges]
    r2 = set(r1)
    for n in r1:
        for e in n.link_edges:
            o = e.other_vert(n)
            if o != v:
                r2.add(o)
    if not r2:
        continue
    nbr_avg = sum((n.co for n in r2), mathutils.Vector((0, 0, 0))) / len(r2)
    local_bulge = v.co.y - nbr_avg.y
    bulges.append((local_bulge, v))

bulges.sort(key=lambda t: t[0])
print("\ntop 15 most forward-bulging verts in blob region, with their component id and component size:")
for b, v in bulges[:15]:
    w = suit.matrix_world @ v.co
    cid = visited[v]
    print(f"  bulge={b:.5f} idx={v.index} pos={tuple(round(c,4) for c in w)} comp_id={cid} comp_size={len(components[cid])}")

bm.free()

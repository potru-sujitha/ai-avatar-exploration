import bpy, bmesh, mathutils, json

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")
suit = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
mesh = suit.data

bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()
bm.edges.ensure_lookup_table()
bm.faces.ensure_lookup_table()

# Known knot-region bbox from Phase 44's re-run of Phase 43's detector.
region_min = mathutils.Vector((-0.030, -0.160, 1.195))
region_max = mathutils.Vector((0.030, -0.055, 1.370))

def in_region(v):
    w = suit.matrix_world @ v.co
    return all(region_min[k] <= w[k] <= region_max[k] for k in range(3))

knot_verts = set(v for v in bm.verts if in_region(v))
print("knot_verts (by bbox):", len(knot_verts))

# Faces fully inside the region = the knot's own bulge faces.
knot_faces = set(f for f in bm.faces if all(v in knot_verts for v in f.verts))
print("knot_faces (all 3/4 verts inside bbox):", len(knot_faces))

# Faces partially inside = the boundary ring connecting knot to collar/shirt.
boundary_faces = set(f for f in bm.faces if (not f in knot_faces) and any(v in knot_verts for v in f.verts))
print("boundary_faces (partial overlap):", len(boundary_faces))

# Boundary verts: verts in knot_verts that touch a face outside knot_faces (the "rim" of the knot island).
rim_verts = set()
for v in knot_verts:
    for f in v.link_faces:
        if f not in knot_faces:
            rim_verts.add(v)
            break
print("rim_verts (knot-region verts touching outside faces):", len(rim_verts))

# Is removing knot_faces going to leave a clean, closeable boundary loop?
# Build boundary edges: edges of knot_faces that are NOT shared with another knot_face.
knot_face_edges = {}
for f in knot_faces:
    for e in f.edges:
        knot_face_edges[e] = knot_face_edges.get(e, 0) + 1
boundary_edges = [e for e, c in knot_face_edges.items() if c == 1]
print("boundary_edges of knot_faces island (c==1, i.e. open edge of the island):", len(boundary_edges))

# Check manifoldness of boundary loop: does it form a single closed loop, or multiple disjoint loops/branches?
from collections import defaultdict
adj = defaultdict(list)
for e in boundary_edges:
    v1, v2 = e.verts[0], e.verts[1]
    adj[v1].append(v2)
    adj[v2].append(v1)
degrees = {v: len(n) for v, n in adj.items()}
deg_hist = defaultdict(int)
for v, d in degrees.items():
    deg_hist[d] += 1
print("boundary-loop vertex degree histogram (2 = clean simple loop, else branching/non-manifold):", dict(deg_hist))

# Trace connected components of the boundary-edge graph.
visited = set()
components = []
for start in adj:
    if start in visited:
        continue
    comp = []
    stack = [start]
    while stack:
        v = stack.pop()
        if v in visited:
            continue
        visited.add(v)
        comp.append(v)
        for n in adj[v]:
            if n not in visited:
                stack.append(n)
    components.append(comp)
print("boundary loop connected components:", len(components), "sizes:", [len(c) for c in components])

# Check: do any rim_verts/boundary loop verts coincide with verts that ALSO belong to the collar's own
# silhouette (approximate: verts within 3mm of the collar's outer edge loop -- find non-manifold boundary
# edges of the WHOLE mesh near this region, which trace the collar's real open edge, e.g. where the collar
# fabric ends against open air/the neck gap).
bm.normal_update()
whole_mesh_boundary_edges = [e for e in bm.edges if len(e.link_faces) == 1]
print("whole-mesh open-boundary edges (collar hem, cuffs, hem, etc.):", len(whole_mesh_boundary_edges))
near_collar_hem = [e for e in whole_mesh_boundary_edges
                    if any(region_min[k]-0.02 <= (suit.matrix_world @ e.verts[0].co)[k] <= region_max[k]+0.02 for k in range(3))]
print("whole-mesh open-boundary edges near the knot region (candidates for 'IS the knot welded to the collar hem'):", len(near_collar_hem))
for e in near_collar_hem[:20]:
    w1 = suit.matrix_world @ e.verts[0].co
    w2 = suit.matrix_world @ e.verts[1].co
    print("  hem edge:", e.verts[0].index, e.verts[1].index, "pos1", tuple(round(c,4) for c in w1), "pos2", tuple(round(c,4) for c in w2))

bm.free()

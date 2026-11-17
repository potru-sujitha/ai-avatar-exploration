import bpy, bmesh, mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")
suit = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
mesh = suit.data

bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()

# The single most forward-bulging vertex from Phase 43's detector (idx=1848, the knot's own tip).
seed_idx = 1848
seed = bm.verts[seed_idx]
print("seed vert world pos:", tuple(round(c,4) for c in (suit.matrix_world @ seed.co)))

# True connectivity flood-fill (not bbox): grow from the seed through shared EDGES only,
# capped at a generous radius so we don't walk across the whole mesh if it's all one blob.
region_min = mathutils.Vector((-0.08, -0.22, 1.10))
region_max = mathutils.Vector((0.08, 0.02, 1.45))
def in_cap(v):
    w = suit.matrix_world @ v.co
    return all(region_min[k] <= w[k] <= region_max[k] for k in range(3))

visited = {seed}
frontier = [seed]
while frontier:
    nxt = []
    for v in frontier:
        for e in v.link_edges:
            o = e.other_vert(v)
            if o not in visited and in_cap(o):
                visited.add(o)
                nxt.append(o)
    frontier = nxt
print("true edge-connected island size within generous cap region:", len(visited))

# Is this island the WHOLE suit mesh (meaning the "knot" is NOT a separable patch at all,
# everything within the cap is one continuous surface with the rest of the shirt), or does
# it stop at a genuine edge (meaning Blender's connectivity agrees there IS a real boundary)?
total_verts_in_cap = len([v for v in bm.verts if in_cap(v)])
print("total verts physically inside the same cap region (bbox only, for comparison):", total_verts_in_cap)
print("-> if island size ~= total verts in cap, the knot is NOT topologically separable from the surrounding shirt surface (one continuous mesh, no real seam).")
print("-> if island size << total verts in cap, there IS a real topological seam/separate piece we could isolate.")

bm.free()

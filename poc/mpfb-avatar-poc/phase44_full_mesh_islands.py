import bpy, bmesh

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")
suit = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
mesh = suit.data

bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()
print("total verts in suit mesh:", len(bm.verts))

visited = set()
components = []
for v0 in bm.verts:
    if v0 in visited:
        continue
    comp = {v0}
    stack = [v0]
    while stack:
        v = stack.pop()
        for e in v.link_edges:
            o = e.other_vert(v)
            if o not in comp:
                comp.add(o)
                stack.append(o)
    visited |= comp
    components.append(comp)

sizes = sorted((len(c) for c in components), reverse=True)
print("number of connected components (true edge-connectivity) in whole suit mesh:", len(components))
print("component sizes (top 10):", sizes[:10])

# Does our known knot seed vertex (idx=1848) belong to the SAME component as the full mesh's largest component?
seed = bm.verts[1848]
seed_comp = next(c for c in components if seed in c)
print("seed vert 1848's component size:", len(seed_comp))
print("is seed's component the largest component?", len(seed_comp) == sizes[0])

bm.free()

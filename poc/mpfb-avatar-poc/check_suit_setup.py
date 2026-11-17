import bpy, bmesh
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")

suit = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
print("materials on suit:", [m.name if m else None for m in suit.data.materials])
print("vertex groups on suit:", [vg.name for vg in suit.vertex_groups])

# which material slot do tie faces use vs their immediate neighbors?
mesh = suit.data
bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()
bm.faces.ensure_lookup_table()
uv_layer = bm.loops.layers.uv.active
img_guess_W, img_guess_H = 2048, 2048
u0,u1 = 1600/img_guess_W, 1930/img_guess_W
v0,v1 = 1800/img_guess_H, 2048/img_guess_H

tie_mat_idxs = set()
nontie_sample_mat_idxs = set()
for f in bm.faces:
    in_region = any(u0<=l[uv_layer].uv.x<=u1 and v0<=l[uv_layer].uv.y<=v1 for l in f.loops)
    if in_region:
        tie_mat_idxs.add(f.material_index)
    else:
        nontie_sample_mat_idxs.add(f.material_index)
print("tie face material indices:", tie_mat_idxs, "-> names:", [suit.data.materials[i].name for i in tie_mat_idxs])
print("non-tie material indices seen:", nontie_sample_mat_idxs)

# vertex group weights for a sample tie vertex vs a sample non-tie chest vertex
tie_vert_idx = None
for f in bm.faces:
    if any(u0<=l[uv_layer].uv.x<=u1 and v0<=l[uv_layer].uv.y<=v1 for l in f.loops):
        tie_vert_idx = f.verts[0].index
        break
bm.free()

if tie_vert_idx is not None:
    v = mesh.vertices[tie_vert_idx]
    print(f"\nsample tie vertex {tie_vert_idx} groups:")
    for g in v.groups:
        print("  ", suit.vertex_groups[g.group].name, "weight:", round(g.weight,3))

# armature object name (root) -- for export convention check
for obj in bpy.data.objects:
    if obj.type == 'ARMATURE':
        print("\narmature object name:", obj.name)

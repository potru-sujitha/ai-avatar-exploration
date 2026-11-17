import bpy, bmesh
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")

obj = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
mesh = obj.data
print("mesh:", mesh.name, "verts:", len(mesh.vertices), "polys:", len(mesh.polygons))
print("uv layers:", [l.name for l in mesh.uv_layers])

bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()
bm.faces.ensure_lookup_table()
uv_layer = bm.loops.layers.uv.active
print("active uv layer:", uv_layer)

# Phase39's tie debug region was painted in pixel coords (1600,1930)-(1800,2048) on a
# presumably 2048x2048 image (W,H unknown exactly -- confirm from image datablock).
img = bpy.data.images.get("Suit2Black_v2")
if img:
    W, H = img.size
    print("Suit2Black_v2 size:", W, H)
else:
    W, H = 2048, 2048
    print("Suit2Black_v2 not found, assuming", W, H)

# Convert pixel region to normalized UV (Blender UV v=0 at bottom, matches Blender image
# pixel y=0 at bottom too, so this maps directly without flipping).
u0, u1 = 1600 / W, 1930 / W
v0, v1 = 1800 / H, 2048 / H
print(f"UV region: u[{u0:.3f},{u1:.3f}] v[{v0:.3f},{v1:.3f}]")

tie_verts = set()
tie_faces = []
for f in bm.faces:
    in_region = False
    for loop in f.loops:
        uv = loop[uv_layer].uv
        if u0 <= uv.x <= u1 and v0 <= uv.y <= v1:
            in_region = True
            break
    if in_region:
        tie_faces.append(f)
        for v in f.verts:
            tie_verts.add(v.index)

print("tie faces found:", len(tie_faces))
print("tie verts found:", len(tie_verts))

if tie_verts:
    import statistics
    tv_list = [bm.verts[i] for i in tie_verts]
    # neighbor ring: verts connected to tie verts but not themselves in tie_verts
    neighbor_verts = set()
    for v in tv_list:
        for e in v.link_edges:
            other = e.other_vert(v)
            if other.index not in tie_verts:
                neighbor_verts.add(other.index)
    print("boundary/neighbor verts (non-tie, adjacent):", len(neighbor_verts))

    # bulge check: compare avg position of tie verts vs avg position of neighbor ring,
    # projected along the approximate local surface normal (use neighbor ring's avg normal)
    import mathutils
    if neighbor_verts:
        nbr_list = [bm.verts[i] for i in neighbor_verts]
        nbr_avg_pos = mathutils.Vector((0,0,0))
        nbr_avg_normal = mathutils.Vector((0,0,0))
        for v in nbr_list:
            nbr_avg_pos += v.co
            nbr_avg_normal += v.normal
        nbr_avg_pos /= len(nbr_list)
        nbr_avg_normal.normalize()

        tie_avg_pos = mathutils.Vector((0,0,0))
        for v in tv_list:
            tie_avg_pos += v.co
        tie_avg_pos /= len(tv_list)

        offset = tie_avg_pos - nbr_avg_pos
        bulge_along_normal = offset.dot(nbr_avg_normal)
        print("tie_avg_pos:", tie_avg_pos)
        print("nbr_avg_pos:", nbr_avg_pos)
        print("nbr_avg_normal:", nbr_avg_normal)
        print("bulge distance along neighbor-ring normal (m):", round(bulge_along_normal, 5))

        # also report max single-vertex bulge
        max_bulge = 0
        for v in tv_list:
            d = (v.co - nbr_avg_pos).dot(nbr_avg_normal)
            if abs(d) > abs(max_bulge):
                max_bulge = d
        print("max single tie-vertex bulge along normal (m):", round(max_bulge, 5))

    # connectivity check: are tie_verts a closed, fully-surrounded island, or do they touch
    # the mesh boundary (open edge) -- i.e. would deleting tie_faces create a hole bordered
    # entirely by neighbor_verts (safe to fill), or does it touch an existing open boundary?
    open_boundary_touch = 0
    for v in tv_list:
        for e in v.link_edges:
            if len(e.link_faces) < 2:
                open_boundary_touch += 1
    print("tie-vert edges touching an existing open mesh boundary:", open_boundary_touch)

bm.free()

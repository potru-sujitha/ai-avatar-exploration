import bpy, bmesh, mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")
suit = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
mesh = suit.data

bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()

# restrict to a generous chest/neck bounding region so we don't pick up unrelated bulges
# (measured tie bbox z was 1.289-1.353; widen generously upward toward the collar/knot and
# a bit in all other directions)
region_min = mathutils.Vector((-0.08, -0.15, 1.20))
region_max = mathutils.Vector((0.08, -0.02, 1.50))

candidates = [v for v in bm.verts if all(region_min[k] <= (suit.matrix_world @ v.co)[k] <= region_max[k] for k in range(3))]
print("candidate verts in region:", len(candidates))

# bulge = how far forward (along -Y, the established front direction) a vertex sits
# compared to the average of its immediate mesh neighbors (local smoothing -> local bulge)
bulges = []
for v in candidates:
    nbrs = [e.other_vert(v) for e in v.link_edges]
    if not nbrs:
        continue
    nbr_avg = sum((n.co for n in nbrs), mathutils.Vector((0, 0, 0))) / len(nbrs)
    local_bulge = (v.co.y - nbr_avg.y)  # more negative Y = further forward = bulges out
    bulges.append((local_bulge, v.index, suit.matrix_world @ v.co))

bulges.sort(key=lambda t: t[0])  # most negative (most forward-bulging) first
print("\nmost forward-bulging 40 verts in region (local_bulge, index, world_pos):")
for b in bulges[:40]:
    print(f"  {b[0]:.5f}  idx={b[1]}  pos={tuple(round(c,4) for c in b[2])}")

# histogram-style threshold check: how many verts bulge forward by more than 3mm locally?
strong_bulge = [b for b in bulges if b[0] < -0.003]
print("\nverts with local forward bulge > 3mm:", len(strong_bulge))
if strong_bulge:
    zs = [b[2].z for b in strong_bulge]
    xs = [b[2].x for b in strong_bulge]
    ys = [b[2].y for b in strong_bulge]
    print("bulge-vert bbox: x[", min(xs), max(xs), "] y[", min(ys), max(ys), "] z[", min(zs), max(zs), "]")
bm.free()

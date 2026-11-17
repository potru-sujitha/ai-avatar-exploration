import bpy, bmesh, mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")
suit = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
mesh = suit.data

bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()

# restrict to the NARROW central column (tie+knot only sit near x=0; this excludes the
# lapel/collar-edge verts at larger |x| that polluted the previous bulge scan)
region_min = mathutils.Vector((-0.028, -0.16, 1.20))
region_max = mathutils.Vector((0.028, -0.02, 1.42))
candidates = [v for v in bm.verts if all(region_min[k] <= (suit.matrix_world @ v.co)[k] <= region_max[k] for k in range(3))]
print("candidates in narrow column:", len(candidates))

# 2-ring neighbor average for a smoother local-bulge baseline
def ring2(v):
    r1 = set()
    for e in v.link_edges:
        r1.add(e.other_vert(v))
    r2 = set(r1)
    for n in r1:
        for e in n.link_edges:
            r2.add(e.other_vert(e.other_vert(e.verts[0]) if False else n))  # placeholder, fixed below
    return r1

bulges = []
for v in candidates:
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
    local_bulge = v.co.y - nbr_avg.y  # negative = forward bulge
    wpos = suit.matrix_world @ v.co
    bulges.append((local_bulge, v.index, wpos))

bulges.sort(key=lambda t: t[0])
print("\nmost forward-bulging 60 in narrow column:")
for b in bulges[:60]:
    print(f"  {b[0]:.5f}  idx={b[1]}  pos={tuple(round(c,4) for c in b[2])}")

strong = [b for b in bulges if b[0] < -0.0015]
print("\nverts with >1.5mm local forward bulge (narrow column):", len(strong))
if strong:
    xs = [b[2].x for b in strong]; ys = [b[2].y for b in strong]; zs = [b[2].z for b in strong]
    print("bbox: x[", min(xs), max(xs), "] y[", min(ys), max(ys), "] z[", min(zs), max(zs), "]")

bm.free()

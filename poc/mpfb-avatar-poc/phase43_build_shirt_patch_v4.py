import bpy, bmesh, mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")

suit = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
armature = bpy.data.objects["Human.rig_export_copy"]

mesh = suit.data
bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()

# --- Step 1: identify the FULL tie+knot vertex set directly by geometry (bulge), not by the
# UV rectangle used in phase40/43 v1-v3 (which only covered the strip and missed the knot,
# as the v1 browser screenshot + clay render of the unmodified baseline both confirmed).
region_min = mathutils.Vector((-0.028, -0.16, 1.19))
region_max = mathutils.Vector((0.028, -0.02, 1.37))
candidates = [v for v in bm.verts if all(region_min[k] <= (suit.matrix_world @ v.co)[k] <= region_max[k] for k in range(3))]

def ring2_of(v):
    r1 = set(e.other_vert(v) for e in v.link_edges)
    r2 = set(r1)
    for n in r1:
        for e in n.link_edges:
            o = e.other_vert(n)
            if o != v:
                r2.add(o)
    return r2

BULGE_THRESHOLD = -0.0012  # >1.2mm forward bulge vs local 2-ring average
tie_verts = set()
for v in candidates:
    r2 = ring2_of(v)
    if not r2:
        continue
    nbr_avg = sum((n.co for n in r2), mathutils.Vector((0, 0, 0))) / len(r2)
    if (v.co.y - nbr_avg.y) < BULGE_THRESHOLD:
        tie_verts.add(v.index)
print("tie verts (geometry-detected):", len(tie_verts))

# boundary ring: non-tie verts directly adjacent to a tie vert (ground-truth, un-bulged suit surface)
ring1 = set()
for vi in tie_verts:
    v = bm.verts[vi]
    for e in v.link_edges:
        other = e.other_vert(v)
        if other.index not in tie_verts:
            ring1.add(other.index)
ring2 = set()
for vi in ring1:
    v = bm.verts[vi]
    for e in v.link_edges:
        other = e.other_vert(v)
        if other.index not in tie_verts and other.index not in ring1:
            ring2.add(other.index)
anchor_idx = ring1 | ring2
print("ring1:", len(ring1), "ring2:", len(ring2), "anchors:", len(anchor_idx))

anchors_world = [suit.matrix_world @ bm.verts[vi].co for vi in anchor_idx]
tie_verts_world = [suit.matrix_world @ bm.verts[vi].co for vi in tie_verts]
bm.free()

min_co = mathutils.Vector((min(v.x for v in tie_verts_world), min(v.y for v in tie_verts_world), min(v.z for v in tie_verts_world)))
max_co = mathutils.Vector((max(v.x for v in tie_verts_world), max(v.y for v in tie_verts_world), max(v.z for v in tie_verts_world)))
print("tie bbox (geometry-detected):", min_co, max_co)

margin_x = 0.016
margin_top = 0.018     # a bit of extra reach up toward/under the collar
margin_bottom = 0.014
x_min, x_max = min_co.x - margin_x, max_co.x + margin_x
z_min, z_max = min_co.z - margin_bottom, max_co.z + margin_top
print("patch footprint: x[", x_min, x_max, "] z[", z_min, z_max, "]")

NX, NY = 16, 26
shirt_offset = 0.0015

def idw_position(qx, qz, power=2.0):
    wsum = mathutils.Vector((0.0, 0.0, 0.0))
    total_w = 0.0
    for a in anchors_world:
        dx = a.x - qx
        dz = a.z - qz
        d2 = dx * dx + dz * dz
        if d2 < 1e-10:
            return a.copy()
        w = 1.0 / (d2 ** (power / 2.0))
        wsum += a * w
        total_w += w
    return wsum / total_w

grid = []
for j in range(NY + 1):
    tz = z_min + (z_max - z_min) * j / NY
    row = []
    for i in range(NX + 1):
        tx = x_min + (x_max - x_min) * i / NX
        row.append(idw_position(tx, tz))
    grid.append(row)

flat = [v for row in grid for v in row]
ys = [v.y for v in flat]
print("interpolated patch Y range:", min(ys), max(ys))
tie_ys = [v.y for v in tie_verts_world]
print("original tie Y range (bulge being removed):", min(tie_ys), max(tie_ys))

for row in grid:
    for v in row:
        v.y -= shirt_offset

new_mesh = bpy.data.meshes.new("ShirtFrontPatchMesh")
bm2 = bmesh.new()
bmverts = [[bm2.verts.new(v) for v in row] for row in grid]
for j in range(NY):
    for i in range(NX):
        v1 = bmverts[j][i]; v2 = bmverts[j][i + 1]; v3 = bmverts[j + 1][i + 1]; v4 = bmverts[j + 1][i]
        bm2.faces.new((v1, v2, v3, v4))
bmesh.ops.recalc_face_normals(bm2, faces=bm2.faces)
bm2.to_mesh(new_mesh)
bm2.free()

patch_obj = bpy.data.objects.new("ShirtFrontPatch", new_mesh)
bpy.context.collection.objects.link(patch_obj)
bpy.context.view_layer.objects.active = patch_obj
bpy.ops.object.shade_smooth()

mat = bpy.data.materials.new(name="ShirtFrontPatchMaterial")
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Base Color"].default_value = (0.90, 0.88, 0.83, 1.0)
if "Roughness" in bsdf.inputs:
    bsdf.inputs["Roughness"].default_value = 0.75
if "Specular IOR Level" in bsdf.inputs:
    bsdf.inputs["Specular IOR Level"].default_value = 0.25
elif "Specular" in bsdf.inputs:
    bsdf.inputs["Specular"].default_value = 0.25
patch_obj.data.materials.append(mat)

weight_scheme = {"Spine2": 0.805, "LeftShoulder": 0.1, "Neck": 0.076, "RightShoulder": 0.02}
for name in weight_scheme:
    patch_obj.vertex_groups.new(name=name)
for vg in patch_obj.vertex_groups:
    vg.add(range(len(patch_obj.data.vertices)), weight_scheme[vg.name], 'REPLACE')

patch_obj.parent = armature
mod = patch_obj.modifiers.new(name="Armature", type='ARMATURE')
mod.object = armature

bpy.context.view_layer.update()

out_path = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v21_candidate.glb"
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    use_selection=False,
    export_apply=False,
    export_yup=True,
    export_animations=True,
    export_skins=True,
    export_morph=True,
    export_morph_normal=True,
)
print("exported:", out_path)

import bpy, bmesh, mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")

suit = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
armature = bpy.data.objects["Human.rig_export_copy"]

mesh = suit.data
bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()
bm.faces.ensure_lookup_table()
uv_layer = bm.loops.layers.uv.active
W, H = 2048, 2048
u0, u1 = 1600 / W, 1930 / W
v0, v1 = 1800 / H, 2048 / H

tie_verts = set()
tie_faces = []
for f in bm.faces:
    if any(u0 <= l[uv_layer].uv.x <= u1 and v0 <= l[uv_layer].uv.y <= v1 for l in f.loops):
        tie_faces.append(f)
        for v in f.verts:
            tie_verts.add(v.index)
print("tie verts:", len(tie_verts))

# 1-ring: non-tie verts directly adjacent to a tie vert (the real, already-correct suit boundary)
ring1 = set()
for vi in tie_verts:
    v = bm.verts[vi]
    for e in v.link_edges:
        other = e.other_vert(v)
        if other.index not in tie_verts:
            ring1.add(other.index)

# 2-ring: non-tie verts adjacent to ring1 (not already in tie_verts/ring1) -- extra anchor density
ring2 = set()
for vi in ring1:
    v = bm.verts[vi]
    for e in v.link_edges:
        other = e.other_vert(v)
        if other.index not in tie_verts and other.index not in ring1:
            ring2.add(other.index)

anchor_idx = ring1 | ring2
print("ring1:", len(ring1), "ring2:", len(ring2), "total anchors:", len(anchor_idx))

anchors_world = [suit.matrix_world @ bm.verts[vi].co for vi in anchor_idx]

tie_verts_world = [suit.matrix_world @ bm.verts[vi].co for vi in tie_verts]
bm.free()

min_co = mathutils.Vector((min(v.x for v in tie_verts_world), min(v.y for v in tie_verts_world), min(v.z for v in tie_verts_world)))
max_co = mathutils.Vector((max(v.x for v in tie_verts_world), max(v.y for v in tie_verts_world), max(v.z for v in tie_verts_world)))
center = (min_co + max_co) / 2
size = max_co - min_co
print("tie bbox:", min_co, max_co, "center:", center, "size:", size)

# patch footprint: tie footprint + modest margin (stay close -- the real boundary ring is the
# ground truth, extrapolating far beyond it is unsupported guesswork)
margin_x = 0.018
margin_top = 0.012
margin_bottom = 0.012
x_min, x_max = min_co.x - margin_x, max_co.x + margin_x
z_min, z_max = min_co.z - margin_bottom, max_co.z + margin_top

NX, NY = 14, 18
shirt_offset = 0.0015  # 1.5mm -- thin nudge outward so the patch doesn't z-fight with the suit surface it blends into

def idw_position(qx, qz, power=2.0):
    # inverse-distance-weighted interpolation of the full 3D anchor position, using
    # in-plane (X,Z) distance from the query point as the weight basis
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
        pos = idw_position(tx, tz)
        row.append(pos)
    grid.append(row)

flat = [v for row in grid for v in row]
ys = [v.y for v in flat]
print("interpolated patch Y (depth) range:", min(ys), max(ys))
tie_ys = [v.y for v in tie_verts_world]
print("original tie Y range (for comparison, this is the bulge we are removing):", min(tie_ys), max(tie_ys))

# nudge every vertex slightly outward along its locally-estimated normal (toward -Y, the
# measured front-facing direction) so the new panel sits a hair proud of the surface it
# blends into, avoiding coincident-surface z-fighting without reintroducing a bulge
for row in grid:
    for v in row:
        v.y -= shirt_offset  # -Y is outward/forward per phase40/43 measurements

# --- build mesh ---
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

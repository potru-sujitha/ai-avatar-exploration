import bpy, bmesh, mathutils
from mathutils.bvhtree import BVHTree

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")

suit = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
body = bpy.data.objects["Human_export_copy"]
armature = bpy.data.objects["Human.rig_export_copy"]

# --- Step 1: re-measure tie region (same method/result as phase40_inspect_tie.py) ---
mesh = suit.data
bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()
uv_layer = bm.loops.layers.uv.active
W, H = 2048, 2048
u0, u1 = 1600 / W, 1930 / W
v0, v1 = 1800 / H, 2048 / H

tie_verts_world = []
for f in bm.faces:
    if any(u0 <= l[uv_layer].uv.x <= u1 and v0 <= l[uv_layer].uv.y <= v1 for l in f.loops):
        for v in f.verts:
            tie_verts_world.append(suit.matrix_world @ v.co)
bm.free()

min_co = mathutils.Vector((min(v.x for v in tie_verts_world), min(v.y for v in tie_verts_world), min(v.z for v in tie_verts_world)))
max_co = mathutils.Vector((max(v.x for v in tie_verts_world), max(v.y for v in tie_verts_world), max(v.z for v in tie_verts_world)))
center = (min_co + max_co) / 2
size = max_co - min_co
print("tie bbox min/max:", min_co, max_co, "size:", size, "center:", center)

margin_x = 0.03   # 3cm each side -> under the lapels
margin_top = 0.035  # extra reach up under the collar
margin_bottom = 0.015
patch_w = size.x + 2 * margin_x
patch_h = size.z + margin_top + margin_bottom
patch_center = mathutils.Vector((center.x, center.y, center.z + (margin_top - margin_bottom) / 2))
print("patch_w:", patch_w, "patch_h:", patch_h, "patch_center:", patch_center)

# outward chest normal, measured in phase40_inspect_tie.py from the real neighbor-ring verts
normal = mathutils.Vector((0.0818, -0.7348, 0.6733)).normalized()
world_up = mathutils.Vector((0, 0, 1))
right = normal.cross(world_up).normalized()
up_in_plane = right.cross(normal).normalized()
print("basis: normal=", normal, "right=", right, "up_in_plane=", up_in_plane)

# --- Step 2: raycast a grid of points from in front of the chest straight back onto the BODY mesh ---
depsgraph = bpy.context.evaluated_depsgraph_get()
body_bvh = BVHTree.FromObject(body, depsgraph)

NX, NY = 16, 20  # grid resolution (columns, rows) -> plenty of subdivision for smooth curvature
offset = 0.004  # 4mm shirt-fabric thickness over the body surface
ray_start_dist = 0.15  # start well in front of the chest, ray back toward -normal

verts_grid = []  # [row][col] -> Vector
miss_count = 0
for j in range(NY + 1):
    row = []
    ty = j / NY - 0.5  # -0.5..0.5
    for i in range(NX + 1):
        tx = i / NX - 0.5
        origin = patch_center + right * (tx * patch_w) + up_in_plane * (ty * patch_h) + normal * ray_start_dist
        direction = -normal
        hit = body_bvh.ray_cast(origin, direction, ray_start_dist + 0.1)
        if hit[0] is not None:
            pos = hit[0] + normal * offset
        else:
            miss_count += 1
            pos = patch_center + right * (tx * patch_w) + up_in_plane * (ty * patch_h)  # fallback, flat
        row.append(pos)
    verts_grid.append(row)

print("ray misses:", miss_count, "/", (NX + 1) * (NY + 1))

flat_verts = [v for row in verts_grid for v in row]
zs = [v.z for v in flat_verts]
print("resulting patch world Z range:", min(zs), max(zs), "(expected ~", center.z - size.z/2 - margin_bottom, "to", center.z + size.z/2 + margin_top, ")")

# sanity: compare against the tie's own measured avg position/bulge
tie_avg = mathutils.Vector((0.0008, -0.0810, 1.3270))
max_bulge_measured = 0.02352
avg_patch_pos = sum(flat_verts, mathutils.Vector((0, 0, 0))) / len(flat_verts)
clearance = (avg_patch_pos - tie_avg).dot(normal)
print("avg patch pos:", avg_patch_pos, "clearance beyond tie_avg along normal (m):", round(clearance, 5), "(tie max bulge was", max_bulge_measured, ")")

# --- Step 3: build the actual mesh from the grid ---
new_mesh = bpy.data.meshes.new("ShirtFrontPatchMesh")
bm2 = bmesh.new()
bmverts = [[bm2.verts.new(v) for v in row] for row in verts_grid]
for j in range(NY):
    for i in range(NX):
        v1 = bmverts[j][i]
        v2 = bmverts[j][i + 1]
        v3 = bmverts[j + 1][i + 1]
        v4 = bmverts[j + 1][i]
        bm2.faces.new((v1, v2, v3, v4))
bmesh.ops.recalc_face_normals(bm2, faces=bm2.faces)
bm2.to_mesh(new_mesh)
bm2.free()

patch_obj = bpy.data.objects.new("ShirtFrontPatch", new_mesh)
bpy.context.collection.objects.link(patch_obj)
bpy.context.view_layer.objects.active = patch_obj
bpy.ops.object.shade_smooth()

# --- Step 4: material -- cloth-like off-white/cream matching a plain dress shirt ---
mat = bpy.data.materials.new(name="ShirtFrontPatchMaterial")
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Base Color"].default_value = (0.90, 0.88, 0.83, 1.0)  # soft cream-white dress-shirt color
if "Roughness" in bsdf.inputs:
    bsdf.inputs["Roughness"].default_value = 0.75  # matte cloth, avoid shine
if "Specular IOR Level" in bsdf.inputs:
    bsdf.inputs["Specular IOR Level"].default_value = 0.25
elif "Specular" in bsdf.inputs:
    bsdf.inputs["Specular"].default_value = 0.25
patch_obj.data.materials.append(mat)

# --- Step 5: skin weighting -- replicate the REAL measured tie-region weighting (phase43 check_suit_setup.py) ---
weight_scheme = {"Spine2": 0.805, "LeftShoulder": 0.1, "Neck": 0.076, "RightShoulder": 0.02}
for name in weight_scheme:
    patch_obj.vertex_groups.new(name=name)
for vg in patch_obj.vertex_groups:
    w = weight_scheme[vg.name]
    vg.add(range(len(patch_obj.data.vertices)), w, 'REPLACE')

# parent to the same armature + add Armature modifier so it deforms identically to the rest of the rig
patch_obj.parent = armature
mod = patch_obj.modifiers.new(name="Armature", type='ARMATURE')
mod.object = armature

bpy.context.view_layer.update()

# --- Step 6: export the full scene (original avatar + new patch) as a NEW candidate file ---
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

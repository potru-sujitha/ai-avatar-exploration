import bpy, bmesh, mathutils, math

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")

suit = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
body = bpy.data.objects["Human_export_copy"]
armature = bpy.data.objects["Human.rig_export_copy"]

# --- Step 1: re-measure the tie region precisely on THIS session's mesh (same method as phase40_inspect_tie.py) ---
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
print("tie bbox min/max:", min_co, max_co)
print("tie bbox size:", size, "center:", center)

# margin so the patch extends past the tie footprint under the collar/lapels (measured, generous but not excessive)
margin_x = 0.025  # 2.5cm each side
margin_z_top = 0.02
margin_z_bottom = 0.01
patch_w = size.x + 2 * margin_x
patch_h = size.z + margin_z_top + margin_z_bottom
patch_center = mathutils.Vector((center.x, center.y, center.z + (margin_z_top - margin_z_bottom) / 2))
print("patch_w:", patch_w, "patch_h:", patch_h, "patch_center:", patch_center)

# --- Step 2: build a subdivided grid sized to the patch, roughly positioned/oriented at the chest ---
bpy.ops.mesh.primitive_grid_add(x_subdivisions=14, y_subdivisions=18, size=1.0, location=(0, 0, 0))
patch_obj = bpy.context.active_object
patch_obj.name = "ShirtFrontPatch"
# grid is in XY plane by default; we want it facing +Y-ish (toward camera/front, matching body forward dir).
# Rotate 90 deg around X so the grid's "width" stays along world X and its surface normal points along -Y (forward),
# matching the chest's own forward-facing orientation (confirmed by tie_avg_pos having negative Y / nbr_avg_normal
# dominant components in -Y/+Z from phase40_inspect_tie.py's measurement).
patch_obj.rotation_euler = (math.radians(90), 0, 0)
patch_obj.scale = (patch_w, 1.0, patch_h)
patch_obj.location = patch_center + mathutils.Vector((0, -0.01, 0))  # start slightly in front, shrinkwrap will correct depth
bpy.context.view_layer.update()
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

# --- Step 3: Shrinkwrap onto the BODY mesh (naturally tie-free curvature), small outward offset for shirt-fabric thickness ---
sw = patch_obj.modifiers.new(name="Shrinkwrap", type='SHRINKWRAP')
sw.target = body
sw.wrap_method = 'NEAREST_SURFACEPOINT'
sw.offset = 0.004  # 4mm outward from the body surface, i.e. roughly where a fitted shirt sits
bpy.context.view_layer.objects.active = patch_obj
bpy.ops.object.modifier_apply(modifier=sw.name)
print("shrinkwrap applied")

# verify: how far does the resulting patch clear the tie's own max bulge?
patch_mesh = patch_obj.data
patch_bm = bmesh.new()
patch_bm.from_mesh(patch_mesh)
patch_bm.verts.ensure_lookup_table()
# approximate local outward normal direction from the earlier neighbor-ring measurement
nbr_normal = mathutils.Vector((0.0818, -0.7348, 0.6733))
patch_world_verts = [patch_obj.matrix_world @ v.co for v in patch_bm.verts]
patch_avg = sum(patch_world_verts, mathutils.Vector((0,0,0))) / len(patch_world_verts)
print("patch avg world pos after shrinkwrap:", patch_avg)
tie_avg = mathutils.Vector((0.0008, -0.0810, 1.3270))  # from phase40 measurement
clearance = (patch_avg - tie_avg).dot(nbr_normal)
print("patch clearance beyond tie_avg along bulge-normal (m):", round(clearance, 5), "(tie max bulge was 0.02352m)")
patch_bm.free()

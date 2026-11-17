import bpy, math, random
from mathutils import Vector

bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v11.blend")

head = bpy.data.objects.get("Human_export_copy")
eye = bpy.data.objects.get("Human.high-poly_export_copy")
bbox = [head.matrix_world @ Vector(c) for c in head.bound_box]
zmin = min(v.z for v in bbox); zmax = max(v.z for v in bbox)
xmin = min(v.x for v in bbox); xmax = max(v.x for v in bbox)
scalp_z = zmin + (zmax - zmin) * 0.90
eye_bbox = [eye.matrix_world @ Vector(c) for c in eye.bound_box]
eye_y = sum(v.y for v in eye_bbox) / len(eye_bbox)
center_x = (xmin + xmax) / 2.0
nmat = head.matrix_world.to_3x3().inverted().transposed()

scalp = []
for v in head.data.vertices:
    wv = head.matrix_world @ v.co
    if wv.z > scalp_z and wv.y >= eye_y:
        wn = (nmat @ v.normal).normalized()
        scalp.append((wv.copy(), wn.copy()))

N_STRANDS = 40
GRID_N = 8
sx0 = min(p[0].x for p in scalp); sx1 = max(p[0].x for p in scalp)
sy0 = min(p[0].y for p in scalp); sy1 = max(p[0].y for p in scalp)
cell_w = max(1e-6, (sx1 - sx0) / GRID_N)
cell_h = max(1e-6, (sy1 - sy0) / GRID_N)
cells = {}
for p in scalp:
    cx = min(GRID_N - 1, int((p[0].x - sx0) / cell_w))
    cy = min(GRID_N - 1, int((p[0].y - sy0) / cell_h))
    cells.setdefault((cx, cy), []).append(p)
occupied = list(cells.keys())
random.seed(42)
random.shuffle(occupied)
guide_roots = []
i = 0
while len(guide_roots) < N_STRANDS and occupied:
    cell = occupied[i % len(occupied)]
    pts = cells[cell]
    guide_roots.append(pts[random.randrange(len(pts))])
    i += 1
    if i >= N_STRANDS * 4:
        break
print(f"guide roots: {len(guide_roots)}")

HAIR_LENGTH = 0.38
POINTS_PER_STRAND = 12
NORMAL_PUSH = 0.05
NORMAL_FADE_T = 0.35

# ===== STEP 1: numerically confirm Phase 26's failure mode on a true-crown root =====
crown_roots = [(r, n) for r, n in guide_roots if n.z > 0.7]
print(f"true-crown roots (n.z>0.7): {len(crown_roots)}/{len(guide_roots)}")
if crown_roots:
    root, normal = crown_roots[0]
    side = 1.0 if root.x > center_x else -1.0
    dist_from_part = abs(root.x - center_x)
    print(f"sample crown root: dist_from_part={dist_from_part:.4f}  normal=({normal.x:.3f},{normal.y:.3f},{normal.z:.3f})")
    print("OLD formula (Phase 26) z-delta at each t (relative to root), + = sticking UP out of scalp:")
    outward_sweep = side * dist_from_part * 0.5  # mid of random(0.3,0.7)
    for i in range(POINTS_PER_STRAND):
        t = i / (POINTS_PER_STRAND - 1)
        ease = t ** 1.1
        normal_ease = max(0.0, 1.0 - t / NORMAL_FADE_T) ** 1.5
        z_delta = normal.z * NORMAL_PUSH * normal_ease - HAIR_LENGTH * 1.0 * ease
        x_delta = normal.x * NORMAL_PUSH * normal_ease + outward_sweep * ease
        tangent_sign = "UP/OUT (spike)" if z_delta > 0 else "down (falling)"
        print(f"  t={t:.3f}  z_delta={z_delta:+.4f}  x_delta={x_delta:+.4f}  -> {tangent_sign}")
    n_spike_points = sum(1 for i in range(POINTS_PER_STRAND)
                          if (normal.z*NORMAL_PUSH*max(0.0,1.0-(i/(POINTS_PER_STRAND-1))/NORMAL_FADE_T)**1.5
                              - HAIR_LENGTH*((i/(POINTS_PER_STRAND-1))**1.1)) > 0)
    print(f"CONFIRMED: {n_spike_points}/{POINTS_PER_STRAND} points on this crown strand sit ABOVE the root (net upward/outward) before falling -> this is the spike.")

# ===== STEP 2: build THREE versions on these same 40 roots: OLD (buggy), ALT (retuned additive), NEW (integrated directional blend) =====
def build_curve(name, point_fn):
    cd = bpy.data.curves.new(name, type='CURVE')
    cd.dimensions = '3D'
    obj = bpy.data.objects.new(name, cd)
    bpy.context.collection.objects.link(obj)
    for root, normal in guide_roots:
        side = 1.0 if root.x > center_x else -1.0
        dist_from_part = abs(root.x - center_x)
        # Real hair always flows to one side as it falls, even very close to a center part --
        # scaling purely by dist_from_part sends true-center strands almost straight down,
        # clipping invisibly behind the head's own silhouette. Floor the sweep at a minimum
        # magnitude so every strand has some lateral spread, large root-distance strands still
        # sweep further.
        MIN_SWEEP = 0.07
        outward_sweep = side * max(MIN_SWEEP, dist_from_part * random.uniform(0.3, 0.7))
        noise_x = random.uniform(-0.06, 0.06)
        noise_y = random.uniform(-0.05, 0.05)
        droop = random.uniform(0.82, 1.18)
        curve_bend = random.uniform(-0.03, 0.03)
        spline = cd.splines.new('POLY')
        spline.points.add(POINTS_PER_STRAND - 1)
        pts = point_fn(root, normal, side, dist_from_part, outward_sweep, noise_x, noise_y, droop, curve_bend)
        for i, (x, y, z) in enumerate(pts):
            spline.points[i].co = (x, y, z, 1.0)
    cd.bevel_depth = 0.0015
    cd.bevel_resolution = 0
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')
    mesh_obj = bpy.context.active_object
    mesh_obj.name = name + "_Mesh"
    mat = bpy.data.materials.new(name + "Mat")
    mat.diffuse_color = (0.25, 0.14, 0.08, 1.0)
    mesh_obj.data.materials.append(mat)
    return mesh_obj

random.seed(43)
def old_points(root, normal, side, dist_from_part, outward_sweep, noise_x, noise_y, droop, curve_bend):
    pts = []
    for i in range(POINTS_PER_STRAND):
        t = i / (POINTS_PER_STRAND - 1)
        ease = t ** 1.1
        normal_ease = max(0.0, 1.0 - t / NORMAL_FADE_T) ** 1.5
        x = root.x + normal.x * NORMAL_PUSH * normal_ease + outward_sweep * ease + noise_x * t + curve_bend * math.sin(t * math.pi)
        y = root.y + normal.y * NORMAL_PUSH * normal_ease + noise_y * t
        z = root.z + normal.z * NORMAL_PUSH * normal_ease - HAIR_LENGTH * droop * ease
        pts.append((x, y, z))
    return pts

random.seed(43)
# ALT: retuned additive -- shrink push and fade window drastically (band-aid tuning fix)
ALT_PUSH = 0.012
ALT_FADE_T = 0.08
def alt_points(root, normal, side, dist_from_part, outward_sweep, noise_x, noise_y, droop, curve_bend):
    pts = []
    for i in range(POINTS_PER_STRAND):
        t = i / (POINTS_PER_STRAND - 1)
        ease = t ** 1.1
        normal_ease = max(0.0, 1.0 - t / ALT_FADE_T) ** 1.5
        x = root.x + normal.x * ALT_PUSH * normal_ease + outward_sweep * ease + noise_x * t + curve_bend * math.sin(t * math.pi)
        y = root.y + normal.y * ALT_PUSH * normal_ease + noise_y * t
        z = root.z + normal.z * ALT_PUSH * normal_ease - HAIR_LENGTH * droop * ease
        pts.append((x, y, z))
    return pts

random.seed(43)
# NEW (primary fix): integrated directional blend -- walk along a continuously-blended UNIT
# tangent direction (never add two independent offset terms that can cross zero). w(t) is a
# single smoothstep from outward-normal direction to fall direction; position is the cumulative
# sum of tangent*step, which by construction cannot reverse sign the way two additive terms can.
def new_points(root, normal, side, dist_from_part, outward_sweep, noise_x, noise_y, droop, curve_bend):
    # Fall direction is ALWAYS the dominant tangent, at full weight, from t=0 onward -- it is
    # never summed against a competing direction that could overpower or cancel it. The scalp
    # normal only contributes a small, decaying PERPENDICULAR nudge (the component of the normal
    # orthogonal to fall_dir), so it pushes the strand sideways/away from the scalp surface near
    # the root without ever being able to reverse or stall the net downward tangent.
    fall_dir = Vector((outward_sweep, noise_y * 2, -HAIR_LENGTH * droop)).normalized()
    out_dir = normal.normalized()
    perp = out_dir - fall_dir * out_dir.dot(fall_dir)  # component of normal perpendicular to fall
    if perp.length > 1e-6:
        perp = perp.normalized()
    PERP_PUSH = 0.35      # perpendicular nudge weight at the root (fraction of unit tangent)
    PERP_FADE_T = 0.2     # decays to 0 by this fraction of strand length
    pos = root.copy()
    pts = [(pos.x, pos.y, pos.z)]
    step_len = (HAIR_LENGTH * droop) / (POINTS_PER_STRAND - 1)
    for i in range(1, POINTS_PER_STRAND):
        t = i / (POINTS_PER_STRAND - 1)
        k = max(0.0, 1.0 - t / PERP_FADE_T) ** 1.5
        tangent = fall_dir + perp * (PERP_PUSH * k)   # fall_dir always present at full weight
        if tangent.length > 1e-6:
            tangent = tangent.normalized()
        bend = curve_bend * math.sin(t * math.pi)
        pos = pos + tangent * step_len
        pts.append((pos.x + bend, pos.y, pos.z))
    return pts

old_mesh = build_curve("OLDHair", old_points)
alt_mesh = build_curve("ALTHair", alt_points)
new_mesh = build_curve("NEWHair", new_points)
# Render each variant IN PLACE on the real head (never translate -- the strand positions are
# already computed in the head's own world space; moving the object detaches it from the scalp
# surface and would make the comparison meaningless). Toggle visibility per render instead.
for m in (old_mesh, alt_mesh, new_mesh):
    m.hide_render = True

# Numeric check on NEW formula for the same sample crown root: confirm no upward excursion
root, normal = crown_roots[0] if crown_roots else guide_roots[0]
side = 1.0 if root.x > center_x else -1.0
dist_from_part = abs(root.x - center_x)
random.seed(99)
outward_sweep = side * dist_from_part * 0.5
fall_dir = Vector((outward_sweep, 0, -HAIR_LENGTH)).normalized()
out_dir = normal.normalized()
perp = out_dir - fall_dir * out_dir.dot(fall_dir)
if perp.length > 1e-6:
    perp = perp.normalized()
PERP_PUSH = 0.35
PERP_FADE_T = 0.2
pos = Vector((0, 0, 0))
step_len = HAIR_LENGTH / (POINTS_PER_STRAND - 1)
print("NEW formula z relative to root (cumulative, should be monotonically non-increasing, no spike):")
zs = [0.0]
for i in range(1, POINTS_PER_STRAND):
    t = i / (POINTS_PER_STRAND - 1)
    k = max(0.0, 1.0 - t / PERP_FADE_T) ** 1.5
    tangent = fall_dir + perp * (PERP_PUSH * k)
    if tangent.length > 1e-6:
        tangent = tangent.normalized()
    pos = pos + tangent * step_len
    zs.append(pos.z)
    print(f"  t={t:.3f}  z_cum={pos.z:+.4f}")
monotonic = all(zs[i+1] <= zs[i] + 1e-6 for i in range(len(zs)-1))
print(f"NEW formula strictly non-increasing in z (no spike): {monotonic}")

# Render gate comparison: front + top
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.render.resolution_x = 900
scene.render.resolution_y = 500
cam_data = bpy.data.cameras.new("GateCam27")
cam_obj = bpy.data.objects.new("GateCam27", cam_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj
views = {
    "front": (Vector((0, -1.3, 1.55)), (math.radians(90), 0, 0)),
    "top":   (Vector((0, -0.05, 2.1)), (0, 0, 0)),
}
variants = {"OLD": old_mesh, "ALT": alt_mesh, "NEW": new_mesh}
for vname, vmesh in variants.items():
    for m in variants.values():
        m.hide_render = True
    vmesh.hide_render = False
    for name, (loc, rot) in views.items():
        cam_obj.location = loc
        cam_obj.rotation_euler = rot
        scene.render.filepath = str(__import__('pathlib').Path(r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc") / f"phase27_compare_{vname}_{name}.png")
        bpy.ops.render.render(write_still=True)
        print(f"rendered compare view: {vname} {name}")

bpy.ops.wm.save_as_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase27_diag_and_gate.blend")
print("DONE diag+gate")

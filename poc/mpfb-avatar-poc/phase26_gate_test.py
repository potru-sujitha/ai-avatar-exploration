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
print(f"scalp candidate points: {len(scalp)}")

# Grid-even sampling (same method Phase 25 already validated for spatial uniformity)
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

crown_count = sum(1 for p, n in guide_roots if n.z > 0.7)
print(f"roots with strongly-upward normal (n.z>0.7, i.e. true crown): {crown_count}/{len(guide_roots)}")

hair_curve_data = bpy.data.curves.new("ProcHairCurvesGate", type='CURVE')
hair_curve_data.dimensions = '3D'
hair_curves_obj = bpy.data.objects.new("ProcHairCurvesGate", hair_curve_data)
bpy.context.collection.objects.link(hair_curves_obj)

HAIR_LENGTH = 0.38
POINTS_PER_STRAND = 12
NORMAL_PUSH = 0.05   # ~5cm outward along the local surface normal before the natural fall takes over
NORMAL_FADE_T = 0.35  # normal push fully faded out by this fraction of strand length

for root, normal in guide_roots:
    side = 1.0 if root.x > center_x else -1.0
    dist_from_part = abs(root.x - center_x)
    outward_sweep = side * dist_from_part * random.uniform(0.3, 0.7)
    noise_x = random.uniform(-0.06, 0.06)
    noise_y = random.uniform(-0.05, 0.05)
    droop = random.uniform(0.82, 1.18)
    curve_bend = random.uniform(-0.03, 0.03)
    spline = hair_curve_data.splines.new('POLY')
    spline.points.add(POINTS_PER_STRAND - 1)
    for i in range(POINTS_PER_STRAND):
        t = i / (POINTS_PER_STRAND - 1)
        ease = t ** 1.1
        normal_ease = max(0.0, 1.0 - t / NORMAL_FADE_T) ** 1.5
        x = root.x + normal.x * NORMAL_PUSH * normal_ease + outward_sweep * ease + noise_x * t + curve_bend * math.sin(t * math.pi)
        y = root.y + normal.y * NORMAL_PUSH * normal_ease + noise_y * t
        z = root.z + normal.z * NORMAL_PUSH * normal_ease - HAIR_LENGTH * droop * ease
        spline.points[i].co = (x, y, z, 1.0)
print(f"built {len(guide_roots)} FIXED guide curves (normal-initialized, fading into natural fall)")

hair_curve_data.bevel_depth = 0.0015
hair_curve_data.bevel_resolution = 0

bpy.ops.object.select_all(action='DESELECT')
hair_curves_obj.select_set(True)
bpy.context.view_layer.objects.active = hair_curves_obj
bpy.ops.object.convert(target='MESH')
hair_mesh_obj = bpy.context.active_object
hair_mesh_obj.name = "GateTestHairMesh"

mat = bpy.data.materials.new("GateHairMat")
mat.diffuse_color = (0.25, 0.14, 0.08, 1.0)
hair_mesh_obj.data.materials.append(mat)

# Quick multi-angle Workbench render for the gate check (Blender-side only, acceptable for this
# intermediate decision gate per the task; final full-avatar evidence will be browser-rendered).
scene = bpy.context.scene
scene.render.engine = 'BLENDER_WORKBENCH'
scene.render.resolution_x = 480
scene.render.resolution_y = 480
cam_data = bpy.data.cameras.new("GateCam")
cam_obj = bpy.data.objects.new("GateCam", cam_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj
head_center = Vector((0, -0.03, 1.5))

views = {
    "front": (Vector((0, -0.55, 1.55)), (math.radians(90), 0, 0)),
    "top":   (Vector((0, -0.05, 2.05)), (0, 0, 0)),
    "side":  (Vector((0.55, -0.03, 1.55)), (math.radians(90), 0, math.radians(90))),
}
for name, (loc, rot) in views.items():
    cam_obj.location = loc
    cam_obj.rotation_euler = rot
    scene.render.filepath = str(__import__('pathlib').Path(r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc") / f"phase26_gate_{name}.png")
    bpy.ops.render.render(write_still=True)
    print(f"rendered gate view: {name}")

bpy.ops.wm.save_as_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase26_gate_test.blend")
print("DONE gate test")

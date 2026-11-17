"""
Phase 25: extends the Phase 24 ribbon-hair test with (1) a real image-texture
alpha channel (Phase 24's procedural Noise->ColorRamp alpha was silently
dropped on export -- confirmed empty baseColorTexture/alphaMode:BLEND-with-no-
texture in the exported JSON), fixed via the proven Phase 4 GREATER_THAN
shader-node technique, now driven by a real Image Texture node; (2) increased
guide-strand count (density parameterized, run at multiple counts to measure
performance); (3) a light styling pass (center part bias + more per-strand
direction variance + gentle natural curve instead of a straight droop).
"""
import bpy
import math
import random
import sys

SRC_BLEND = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v11.blend"
OUT_DIR = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase24-hair-curve-test"
STRAND_TEX = OUT_DIR + r"\strand_alpha.png"

N_STRANDS = int(sys.argv[sys.argv.index("--") + 1]) if "--" in sys.argv else 300
OUT_NAME = sys.argv[sys.argv.index("--") + 2] if "--" in sys.argv else f"test_haircard_v2_{N_STRANDS}.glb"

bpy.ops.wm.open_mainfile(filepath=SRC_BLEND)

head = None
for obj in bpy.data.objects:
    if obj.type == 'MESH' and 'high-poly' in obj.name.lower():
        head = obj
        break
if head is None:
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    head = max(meshes, key=lambda o: len(o.data.vertices))
print(f"Using head mesh: {head.name}, verts={len(head.data.vertices)}")

from mathutils import Vector
bbox = [head.matrix_world @ Vector(c) for c in head.bound_box]
zmin = min(v.z for v in bbox)
zmax = max(v.z for v in bbox)
xmin = min(v.x for v in bbox)
xmax = max(v.x for v in bbox)
scalp_z_threshold = zmin + (zmax - zmin) * 0.72
center_x = (xmin + xmax) / 2.0

scalp_points = []
for v in head.data.vertices:
    wv = head.matrix_world @ v.co
    if wv.z > scalp_z_threshold:
        scalp_points.append(wv)
print(f"Scalp candidate points: {len(scalp_points)}")

random.seed(42)
random.shuffle(scalp_points)
pool = scalp_points if len(scalp_points) >= N_STRANDS else scalp_points * (N_STRANDS // len(scalp_points) + 1)
guide_roots = pool[:N_STRANDS]

curve_data = bpy.data.curves.new("TestHairCurves", type='CURVE')
curve_data.dimensions = '3D'
curves_obj = bpy.data.objects.new("TestHairCurves", curve_data)
bpy.context.collection.objects.link(curves_obj)

HAIR_LENGTH = 0.38
POINTS_PER_STRAND = 12  # +2 vs Phase 24, for a smoother natural curve, not just a straight droop

for root in guide_roots:
    # Styling pass: center-part bias (strands near the midline flow straighter down;
    # strands further from the midline sweep outward/sideways more, like real hair
    # falling to either side of a part), plus a gentle S-curve instead of a straight
    # taper, plus more per-strand direction variance than Phase 24's test.
    side = 1.0 if root.x > center_x else -1.0
    dist_from_part = abs(root.x - center_x)
    outward_sweep = side * dist_from_part * random.uniform(0.3, 0.7)
    noise_x = random.uniform(-0.06, 0.06)
    noise_y = random.uniform(-0.05, 0.05)
    droop = random.uniform(0.82, 1.18)
    curve_bend = random.uniform(-0.03, 0.03)
    spline = curve_data.splines.new('POLY')
    spline.points.add(POINTS_PER_STRAND - 1)
    for i in range(POINTS_PER_STRAND):
        t = i / (POINTS_PER_STRAND - 1)
        ease = t ** 1.1
        x = root.x + outward_sweep * ease + noise_x * t + curve_bend * math.sin(t * math.pi)
        y = root.y + noise_y * t
        z = root.z - HAIR_LENGTH * droop * ease
        spline.points[i].co = (x, y, z, 1.0)

print(f"Built {len(guide_roots)} guide curves ({len(curve_data.splines)} splines)")

mesh_data = bpy.data.meshes.new("TestHairCardMesh")
hair_mesh_obj = bpy.data.objects.new("TestHairCardMesh", mesh_data)
bpy.context.collection.objects.link(hair_mesh_obj)

mod = hair_mesh_obj.modifiers.new("CurveToCard", 'NODES')
node_group = bpy.data.node_groups.new("CurveToCardRibbon", 'GeometryNodeTree')
mod.node_group = node_group

node_group.interface.new_socket(name="Geometry", in_out='INPUT', socket_type='NodeSocketGeometry')
node_group.interface.new_socket(name="Geometry", in_out='OUTPUT', socket_type='NodeSocketGeometry')

nodes = node_group.nodes
links = node_group.links
nodes.clear()

n_in = nodes.new('NodeGroupInput')
n_out = nodes.new('NodeGroupOutput')
n_obj_info = nodes.new('GeometryNodeObjectInfo')
n_obj_info.inputs['Object'].default_value = curves_obj
n_curve_to_mesh = nodes.new('GeometryNodeCurveToMesh')
n_line = nodes.new('GeometryNodeCurvePrimitiveLine')
n_line.inputs['Start'].default_value = (-0.0035, 0, 0)
n_line.inputs['End'].default_value = (0.0035, 0, 0)
n_set_radius = nodes.new('GeometryNodeSetCurveRadius')
n_spline_param = nodes.new('GeometryNodeSplineParameter')
n_map_range = nodes.new('ShaderNodeMapRange')
n_map_range.inputs['To Min'].default_value = 1.0
n_map_range.inputs['To Max'].default_value = 0.2  # slightly finer tip than Phase 24 (was 0.25)

links.new(n_obj_info.outputs['Geometry'], n_set_radius.inputs['Curve'])
links.new(n_spline_param.outputs['Factor'], n_map_range.inputs['Value'])
links.new(n_map_range.outputs['Result'], n_set_radius.inputs['Radius'])
links.new(n_set_radius.outputs['Curve'], n_curve_to_mesh.inputs['Curve'])
links.new(n_line.outputs['Curve'], n_curve_to_mesh.inputs['Profile Curve'])
links.new(n_curve_to_mesh.outputs['Mesh'], n_out.inputs['Geometry'])

bpy.context.view_layer.objects.active = hair_mesh_obj
depsgraph = bpy.context.evaluated_depsgraph_get()
eval_obj = hair_mesh_obj.evaluated_get(depsgraph)
real_mesh = bpy.data.meshes.new_from_object(eval_obj)
hair_mesh_obj.modifiers.clear()
hair_mesh_obj.data = real_mesh
print(f"Converted to real mesh: verts={len(real_mesh.vertices)}, polys={len(real_mesh.polygons)}")

# UV unwrap: Smart UV Project per-island. The Curve-to-Mesh output leaves each
# strand as a disconnected strip, so each becomes its own UV island; Smart UV
# Project reasonably preserves the strip's long thin aspect ratio per island,
# which is good enough to map the strand_alpha texture's fiber pattern onto
# each strand (exact per-strand root/tip V-alignment is NOT guaranteed by this
# method -- a real limitation, noted honestly in the report rather than
# assumed perfect).
bpy.ops.object.select_all(action='DESELECT')
hair_mesh_obj.select_set(True)
bpy.context.view_layer.objects.active = hair_mesh_obj
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.01)
bpy.ops.object.mode_set(mode='OBJECT')

# Real image-texture-driven material (the actual Phase 24 bug fix): an Image
# Texture node feeds both Base Color and, through the proven Phase 4
# GREATER_THAN math node, the Principled BSDF's Alpha input.
mat = bpy.data.materials.new("TestHairCardMatV2")
mat.use_nodes = True
nt = mat.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)

out_node = nt.nodes.new('ShaderNodeOutputMaterial')
bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
bsdf.inputs['Roughness'].default_value = 0.5  # established "reduce shine" value range from Phase 18/20

tex_image_node = nt.nodes.new('ShaderNodeTexImage')
strand_img = bpy.data.images.load(STRAND_TEX)
tex_image_node.image = strand_img

# Phase 4's proven alpha-clip fix: GREATER_THAN node directly upstream of Alpha.
math_node = nt.nodes.new('ShaderNodeMath')
math_node.operation = 'GREATER_THAN'
math_node.label = "AlphaClipFix_Phase25"
math_node.inputs[1].default_value = 0.25  # cutoff, tuned against the generated texture's alpha range

nt.links.new(tex_image_node.outputs['Color'], bsdf.inputs['Base Color'])
nt.links.new(tex_image_node.outputs['Alpha'], math_node.inputs[0])
nt.links.new(math_node.outputs['Value'], bsdf.inputs['Alpha'])
nt.links.new(bsdf.outputs['BSDF'], out_node.inputs['Surface'])

hair_mesh_obj.data.materials.append(mat)

bpy.ops.object.select_all(action='DESELECT')
hair_mesh_obj.select_set(True)
bpy.context.view_layer.objects.active = hair_mesh_obj
out_path = OUT_DIR + "\\" + OUT_NAME
bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', use_selection=True, export_animations=False)
print(f"Exported: {out_path}")
print(f"STRAND_COUNT={N_STRANDS} VERT_COUNT={len(real_mesh.vertices)} POLY_COUNT={len(real_mesh.polygons)}")

import bpy, mathutils
from mathutils.bvhtree import BVHTree

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")
body = bpy.data.objects["Human_export_copy"]
depsgraph = bpy.context.evaluated_depsgraph_get()
body_bvh = BVHTree.FromObject(body, depsgraph)

tie_min = mathutils.Vector((-0.0171, -0.1025, 1.2890))
tie_max = mathutils.Vector((0.0169, -0.0665, 1.3532))
tie_center = (tie_min + tie_max) / 2

margin_x = 0.02
margin_top = 0.01
margin_bottom = 0.015

for tz in [tie_min.z - margin_bottom, tie_center.z, tie_max.z + margin_top]:
    for tx in [tie_min.x - margin_x, tie_center.x, tie_max.x + margin_x]:
        query = mathutils.Vector((tx, tie_center.y, tz))
        hit = body_bvh.find_nearest(query)
        print(f"query=({tx:.3f},{tie_center.y:.3f},{tz:.3f}) -> hit={hit[0]} normal={hit[1]} dist={hit[3]:.4f}")

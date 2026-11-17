import bpy, mathutils
from mathutils.bvhtree import BVHTree

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")
body = bpy.data.objects["Human_export_copy"]

depsgraph = bpy.context.evaluated_depsgraph_get()
body_bvh = BVHTree.FromObject(body, depsgraph)

normal = mathutils.Vector((0.0818, -0.7348, 0.6733)).normalized()
tie_avg = mathutils.Vector((0.0008, -0.0810, 1.3270))

for dist in [0.02, 0.05, 0.10, 0.15, 0.30, 0.50]:
    origin = tie_avg + normal * dist
    direction = -normal
    hit = body_bvh.ray_cast(origin, direction, dist + 0.6)
    print(f"start_dist={dist}: origin={origin}  hit_loc={hit[0]}  hit_dist={hit[3]}")

# also try casting straight along pure -Y and pure +Y to sanity check which way the body front actually faces
for d in [mathutils.Vector((0,-1,0)), mathutils.Vector((0,1,0)), mathutils.Vector((0,0,-1)), mathutils.Vector((0,0,1))]:
    origin = tie_avg + d * -0.3  # start opposite side, 30cm back
    hit = body_bvh.ray_cast(origin, d, 0.6)
    print(f"axis-aligned dir={tuple(d)}: origin={origin} hit={hit[0]} dist={hit[3]}")

# closest point on body to tie_avg (brute force using find_nearest)
nearest = body_bvh.find_nearest(tie_avg)
print("find_nearest to tie_avg:", nearest)

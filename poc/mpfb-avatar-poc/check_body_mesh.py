import bpy, mathutils
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")

for obj in bpy.data.objects:
    if obj.type == 'MESH':
        print(obj.name, "-> mesh:", obj.data.name, "verts:", len(obj.data.vertices))

# the suit object and its tie region center (from phase40_inspect_tie.py measurement)
tie_center = mathutils.Vector((0.0008, -0.0810, 1.3270))
print("\n--- checking distance from each mesh's nearest vertex to tie_center ---")
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    mesh = obj.data
    min_d = 999
    for v in mesh.vertices:
        world_co = obj.matrix_world @ v.co
        d = (world_co - tie_center).length
        if d < min_d:
            min_d = d
    print(obj.name, "closest vertex distance to tie center:", round(min_d, 4))

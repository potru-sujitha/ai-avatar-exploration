import bpy, sys

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v18_candidate_v2.glb")

print("=== MESHES ===")
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        mats = [s.material.name if s.material else None for s in obj.material_slots]
        print(f"{obj.name}  verts={len(obj.data.vertices)}  mats={mats}")

print("\n=== MATERIALS with image textures ===")
for mat in bpy.data.materials:
    if not mat.use_nodes:
        continue
    for node in mat.node_tree.nodes:
        if node.type == 'TEX_IMAGE' and node.image:
            print(f"material={mat.name}  node={node.name}  image={node.image.name}  size={node.image.size[:]}")

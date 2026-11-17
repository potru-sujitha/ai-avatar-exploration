import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v18_candidate_v3.glb")

for mat in bpy.data.materials:
    if mat is None or not mat.use_nodes:
        continue
    imgs = []
    for node in mat.node_tree.nodes:
        if node.type == 'TEX_IMAGE' and node.image:
            imgs.append((node.name, node.image.name, node.image.size[0], node.image.size[1]))
    if imgs:
        print(f"MATERIAL: {mat.name}")
        for n, img, w, h in imgs:
            print(f"   node={n} image={img} size={w}x{h}")

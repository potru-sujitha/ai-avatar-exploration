import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v18_candidate_v3.glb")
mat = bpy.data.materials.get("Human.toigo_female_suit_2")
nt = mat.node_tree
for node in nt.nodes:
    if node.type == 'TEX_IMAGE':
        outs = []
        for link in nt.links:
            if link.from_node == node:
                outs.append(f"{link.to_node.name}.{link.to_socket.name}")
        print(f"{node.name} (image={node.image.name if node.image else None}) -> {outs}")
    if node.type == 'BSDF_PRINCIPLED':
        print(f"BSDF inputs: Specular IOR Level linked={node.inputs['Specular IOR Level'].is_linked}, Roughness linked={node.inputs['Roughness'].is_linked}")

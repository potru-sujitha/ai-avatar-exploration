import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v18_candidate_v3.glb")
mat = bpy.data.materials.get("Human.toigo_female_suit_2")
for node in mat.node_tree.nodes:
    if node.type == 'TEX_IMAGE' and node.image and node.image.name == 'Fsuit2-spec':
        node.image.filepath_raw = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase39_extracted_spec.png"
        node.image.file_format = 'PNG'
        node.image.save()
        print("saved spec map")
    if node.type == 'TEX_IMAGE' and node.image and 'Suit2NormNoTie' in node.image.name:
        node.image.filepath_raw = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase39_extracted_norm.png"
        node.image.file_format = 'PNG'
        node.image.save()
        print("saved norm map")

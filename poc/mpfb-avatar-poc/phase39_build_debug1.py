import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v18_candidate_v3.glb")
mat_suit = bpy.data.materials.get("Human.toigo_female_suit_2")
for node in mat_suit.node_tree.nodes:
    if node.type == 'TEX_IMAGE' and node.image and node.image.name == 'Suit2Black_v2':
        node.image = bpy.data.images.load(r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase39-textures\Suit2Black_debug_region1.png")
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase39_debug1.glb", export_format='GLB', use_selection=True, export_animations=False)
print("exported debug1")

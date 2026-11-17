import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v18_candidate_v2.glb")

# Swap only the body/skin material's Image Texture to the scalp-fixed version.
mat = bpy.data.materials.get("Human.body")
assert mat is not None, "Human.body material not found"
tex_node = None
for node in mat.node_tree.nodes:
    if node.type == 'TEX_IMAGE':
        tex_node = node
        break
assert tex_node is not None, "no Image Texture node on Human.body"
print("original image:", tex_node.image.name, tex_node.image.filepath)

new_img = bpy.data.images.load(r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase38-textures\WarmNeutralSkin_scalpfix.png")
tex_node.image = new_img
print("swapped to:", new_img.name)

# Export, selecting everything, same settings pattern used throughout this investigation.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v18_candidate_v3.glb",
    export_format='GLB',
    use_selection=True,
    export_animations=False,
)
print("exported avatar_v18_candidate_v3.glb")

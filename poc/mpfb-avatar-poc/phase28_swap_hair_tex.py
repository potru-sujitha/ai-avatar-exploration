"""
Phase 28: import the verified avatar_v12.glb directly (not re-running the MPFB
generation pipeline), swap ONLY the hair material's base-color image to a candidate
texture, and re-export as an isolated test GLB. Fast iteration loop for texture-only
hair experiments -- never touches avatar_v12.glb itself.
"""
import bpy
import sys

argv = sys.argv[sys.argv.index("--") + 1:]
NEW_TEX = argv[0]
OUT_GLB = argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v12.glb")

hair_mat = None
for mat in bpy.data.materials:
    if "long01" in mat.name.lower() or "hair" in mat.name.lower():
        hair_mat = mat
        print("Found hair material:", mat.name)

if hair_mat is None:
    print("ERROR: no hair material found. All materials:", [m.name for m in bpy.data.materials])
    sys.exit(1)

bsdf = next((n for n in hair_mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
base_color_input = bsdf.inputs['Base Color']
tex_node = None
for link in hair_mat.node_tree.links:
    if link.to_socket == base_color_input and link.from_node.type == 'TEX_IMAGE':
        tex_node = link.from_node
        break

if tex_node is None:
    print("ERROR: no image texture feeding Base Color on hair material")
    sys.exit(1)

print("Current hair texture:", tex_node.image.name, tex_node.image.filepath)
new_img = bpy.data.images.load(NEW_TEX)
tex_node.image = new_img

# Also repoint the Alpha input if it uses the same or a different texture node's alpha
alpha_input = bsdf.inputs.get('Alpha')
if alpha_input and alpha_input.is_linked:
    for link in hair_mat.node_tree.links:
        if link.to_socket == alpha_input and link.from_node.type == 'TEX_IMAGE':
            print("Repointing alpha source too:", link.from_node.image.name)
            link.from_node.image = new_img

bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format='GLB',
    export_animations=False,
)
print("WROTE", OUT_GLB)

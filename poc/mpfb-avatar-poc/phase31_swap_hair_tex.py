"""Phase 31: same swap technique as Phase 28/30, build a candidate from avatar_v12.glb
with a given hair texture, for hairline-fix comparison."""
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

bsdf = next((n for n in hair_mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
base_color_input = bsdf.inputs['Base Color']
tex_node = None
for link in hair_mat.node_tree.links:
    if link.to_socket == base_color_input and link.from_node.type == 'TEX_IMAGE':
        tex_node = link.from_node
        break

new_img = bpy.data.images.load(NEW_TEX)
tex_node.image = new_img

alpha_input = bsdf.inputs.get('Alpha')
if alpha_input and alpha_input.is_linked:
    for link in hair_mat.node_tree.links:
        if link.to_socket == alpha_input and link.from_node.type == 'TEX_IMAGE':
            link.from_node.image = new_img

bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format='GLB', export_animations=False)
print("WROTE", OUT_GLB)

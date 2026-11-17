import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v18_candidate_v3.glb")
mat = bpy.data.materials.get("Human.toigo_female_suit_2")
nt = mat.node_tree
for node in nt.nodes:
    if node.type == 'SEPARATE_COLOR' or node.name.startswith('Separate Color'):
        for link in nt.links:
            if link.from_node == node:
                print(f"SeparateColor out {link.from_socket.name} -> {link.to_node.name}.{link.to_socket.name}")
            if link.to_node == node:
                print(f"into SeparateColor: {link.from_node.name}.{link.from_socket.name} -> {link.to_socket.name}")

# Sample the actual pixel value in the "jacket" (magenta) region vs "white" region of Fsuit2-spec
import os
img = bpy.data.images.get("Fsuit2-spec")
pix = list(img.pixels)
w, h = img.size
def sample(x, y):
    i = (y * w + x) * 4
    return pix[i], pix[i+1], pix[i+2], pix[i+3]
print("jacket-region sample (10,10):", sample(10, 10))
print("white-region sample (1200,100):", sample(1200, 100))
print("light-pink-region sample (1900,500):", sample(1900, 500))

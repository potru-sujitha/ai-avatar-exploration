import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")

obj = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
mat = obj.data.materials[0]
print("material:", mat.name)
img = None
for node in mat.node_tree.nodes:
    if node.type == 'TEX_IMAGE' and node.image:
        print("found image node:", node.name, node.image.name, node.image.size)
        if img is None:
            img = node.image

W, H = img.size
pix = img.pixels[:]

# Scan for near-white pixels (the tie/collar material) anywhere in the texture,
# report connected bounding boxes roughly via a simple grid histogram (16x16 cells)
# to see where white clusters live besides the collar region we already know about.
cell = 64
grid = {}
for gy in range(0, H, cell):
    for gx in range(0, W, cell):
        white_count = 0
        total = 0
        for y in range(gy, min(gy+cell, H), 4):
            for x in range(gx, min(gx+cell, W), 4):
                i = (y*W+x)*4
                r,g,b = pix[i], pix[i+1], pix[i+2]
                total += 1
                if r > 0.8 and g > 0.8 and b > 0.8:
                    white_count += 1
        if total and white_count/total > 0.3:
            grid[(gx,gy)] = round(white_count/total, 2)

print("white-dominant 64px cells (x,y) -> fraction:")
for k,v in sorted(grid.items(), key=lambda kv: (kv[0][1], kv[0][0])):
    print(" ", k, v)

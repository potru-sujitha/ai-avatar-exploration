import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")
suit = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
mat = suit.data.materials[0]
img = None
for n in mat.node_tree.nodes:
    if n.type == 'TEX_IMAGE' and n.image:
        img = n.image
        print("found image node:", n.name, "->", img.name, img.size[:])
if img:
    W, H = img.size
    # sample a grid of points, find whitest pixel outside the tie UV rect
    u0,u1,v0,v1 = 1600/2048, 1930/2048, 1800/2048, 2048/2048
    best = None
    pix = img.pixels[:]  # flat RGBA
    import random
    random.seed(0)
    for _ in range(4000):
        px = random.randint(0, W-1)
        py = random.randint(0, H-1)
        u, v = px/W, py/H
        if u0<=u<=u1 and v0<=v<=v1:
            continue
        idx = (py*W + px) * 4
        r,g,b,a = pix[idx:idx+4]
        if a < 0.9:
            continue
        brightness = r+g+b
        if best is None or brightness > best[0]:
            best = (brightness, r,g,b, u, v)
    print("whitest sampled non-tie pixel: RGB=", best[1:4], "at uv=", best[4:6])

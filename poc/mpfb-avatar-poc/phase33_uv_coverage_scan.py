import bpy, array

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v12.glb")

hair_obj = None
for obj in bpy.data.objects:
    if obj.type == 'MESH' and any("long01" in (s.material.name.lower() if s.material else "")
                                   for s in obj.material_slots):
        hair_obj = obj
        break
mesh = hair_obj.data
uv_layer = mesh.uv_layers.active.data
mesh.calc_loop_triangles()

# Load the fixed20 texture to classify each coarse grid point by luminance.
img = bpy.data.images.load(r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase30-textures\long01_fixed20.png")
w, h = img.size
pix = array.array('f', img.pixels[:])

def sample_lum(u, v):
    x = min(int(u * w), w-1)
    y = min(int(v * h), h-1)
    idx = (y * w + x) * 4
    r, g, b = pix[idx], pix[idx+1], pix[idx+2]
    return 0.3*r + 0.59*g + 0.11*b

def point_in_tri(p, a, b, c):
    def sign(p1, p2, p3):
        return (p1[0]-p3[0])*(p2[1]-p3[1]) - (p2[0]-p3[0])*(p1[1]-p3[1])
    d1 = sign(p, a, b); d2 = sign(p, b, c); d3 = sign(p, c, a)
    has_neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    has_pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (has_neg and has_pos)

# Precompute triangle UV bboxes for fast rejection
tris = []
for tri in mesh.loop_triangles:
    uvs = [(uv_layer[li].uv.x, uv_layer[li].uv.y) for li in tri.loops]
    verts = [mesh.vertices[tri.vertices[k]] for k in range(3)]
    world_co = [hair_obj.matrix_world @ v.co for v in verts]
    cz = sum(c.z for c in world_co) / 3
    cy = sum(c.y for c in world_co) / 3
    umin = min(u for u,v in uvs); umax = max(u for u,v in uvs)
    vmin = min(v for u,v in uvs); vmax = max(v for u,v in uvs)
    tris.append((uvs, umin, umax, vmin, vmax, cz, cy))

print("total triangles:", len(tris))
# crown/hairline region heuristic: top of mesh. bbox Z was 0.903-1.614.
Z_CROWN_THRESH = 1.45  # upper portion of the head mesh

GRID = 80  # 80x80 coarse scan of UV space
near_black_hits = []
hair_color_hits = []
for gy in range(GRID):
    v = gy / GRID
    for gx in range(GRID):
        u = gx / GRID
        lum = sample_lum(u, v)
        is_dark = lum < 0.55
        if not is_dark:
            continue  # only care about pixels that WOULD be excluded/restored by our mask logic, and specifically now check the dark ones (padding/edge) for visibility
        for (uvs, umin, umax, vmin, vmax, cz, cy) in tris:
            if u < umin or u > umax or v < vmin or v > vmax:
                continue
            if point_in_tri((u, v), uvs[0], uvs[1], uvs[2]):
                near_black_hits.append((u, v, round(lum,3), round(cz,3), round(cy,3)))
                break

print(f"\nScanned a {GRID}x{GRID} coarse grid of UV space.")
print(f"Dark/near-black (lum<0.55) grid points that ARE covered by a real rendered triangle: {len(near_black_hits)}")
crown_region = [h for h in near_black_hits if h[3] > Z_CROWN_THRESH]
print(f"Of those, in the upper/crown-hairline region (world Z > {Z_CROWN_THRESH}): {len(crown_region)}")
print("\nSample of dark-but-rendered points in the crown/hairline region (u, v, lum, world_z, world_y):")
for p in crown_region[:15]:
    print(" ", p)

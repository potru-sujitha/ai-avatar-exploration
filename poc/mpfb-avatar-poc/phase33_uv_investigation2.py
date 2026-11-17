import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v12.glb")

hair_obj = None
for obj in bpy.data.objects:
    if obj.type == 'MESH' and any("long01" in (s.material.name.lower() if s.material else "")
                                   for s in obj.material_slots):
        hair_obj = obj
        break
print("Hair object:", hair_obj.name if hair_obj else "NOT FOUND")

mesh = hair_obj.data
uv_layer = mesh.uv_layers.active.data
mesh.calc_loop_triangles()

def point_in_tri(p, a, b, c):
    def sign(p1, p2, p3):
        return (p1[0]-p3[0])*(p2[1]-p3[1]) - (p2[0]-p3[0])*(p1[1]-p3[1])
    d1 = sign(p, a, b); d2 = sign(p, b, c); d3 = sign(p, c, a)
    has_neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    has_pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (has_neg and has_pos)

targets = [
    ("blackpad_1", 0.0010, 0.0),
    ("blackpad_2", 0.0020, 0.0),
    ("blackpad_3", 0.3086, 0.0),
    ("blackpad_4", 0.6084, 0.0),
    ("blackpad_5", 0.6104, 0.0),
]

hit_count = {name: 0 for name, _, _ in targets}
hit_world = {name: [] for name, _, _ in targets}

for tri in mesh.loop_triangles:
    uvs = [uv_layer[li].uv for li in tri.loops]
    for name, tu, tv in targets:
        if point_in_tri((tu, tv), (uvs[0].x, uvs[0].y), (uvs[1].x, uvs[1].y), (uvs[2].x, uvs[2].y)):
            hit_count[name] += 1
            verts = [mesh.vertices[tri.vertices[k]] for k in range(3)]
            world_co = [hair_obj.matrix_world @ v.co for v in verts]
            centroid = sum(world_co, world_co[0].__class__())
            cx = sum(c.x for c in world_co)/3
            cy = sum(c.y for c in world_co)/3
            cz = sum(c.z for c in world_co)/3
            if len(hit_world[name]) < 3:
                hit_world[name].append((round(cx,3), round(cy,3), round(cz,3)))

print("\nPoint-in-UV-triangle results (does any triangle's UV footprint actually cover this texel):")
for name, tu, tv in targets:
    print(f"  {name} (u={tu:.4f}, v={tv:.4f}): {hit_count[name]} triangles cover it")
    for w in hit_world[name]:
        print("    triangle centroid world xyz=", w)

print("\nFor reference, hair mesh world bbox Z range is 0.903 (bottom/shoulders) to 1.614 (crown).")
print("Front-of-head / hairline area is roughly the upper-front portion (high Z, Y toward front).")

import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v12.glb")

hair_obj = None
for obj in bpy.data.objects:
    if obj.type == 'MESH' and any("long01" in (s.material.name.lower() if s.material else "") or
                                   "hair" in (s.material.name.lower() if s.material else "")
                                   for s in obj.material_slots):
        hair_obj = obj
        break

print("Hair object:", hair_obj.name if hair_obj else "NOT FOUND")
mesh = hair_obj.data
uv_layer = mesh.uv_layers.active.data

# Target coordinates from Phase 32's measured black-padding pixels (u, v):
targets = [
    (0.0010, 0.0),
    (0.0020, 0.0),
    (0.3086, 0.0),
    (0.6084, 0.0),
    (0.6104, 0.0),
]
TOL = 0.01

print("\nChecking which faces' UV footprint covers each target coordinate (tol=%.3f):" % TOL)
hair_obj.data.calc_loop_triangles()
world_hits = {}
for ti, target in enumerate(targets):
    tu, tv = target
    hits = []
    for poly in mesh.polygons:
        for loop_idx in poly.loop_indices:
            uv = uv_layer[loop_idx].uv
            if abs(uv.x - tu) < TOL and abs(uv.y - tv) < TOL:
                vert_idx = mesh.loops[loop_idx].vertex_index
                co = mesh.vertices[vert_idx].co
                world_co = hair_obj.matrix_world @ co
                hits.append((poly.index, vert_idx, round(world_co.x,3), round(world_co.y,3), round(world_co.z,3)))
    print(f"  target u={tu:.4f} v={tv:.4f}: {len(hits)} loop-vertex hits")
    for h in hits[:5]:
        print("    face", h[0], "vert", h[1], "world xyz=", h[2:])
    world_hits[ti] = hits

# Summarize: do any of these land in the front-hairline / top-of-head region (high Z, near-front Y)?
print("\nBounding box of hair mesh (world space):")
coords = [hair_obj.matrix_world @ v.co for v in mesh.vertices]
xs = [c.x for c in coords]; ys = [c.y for c in coords]; zs = [c.z for c in coords]
print(f"  X: {min(xs):.3f} to {max(xs):.3f}")
print(f"  Y: {min(ys):.3f} to {max(ys):.3f}")
print(f"  Z: {min(zs):.3f} to {max(zs):.3f}")

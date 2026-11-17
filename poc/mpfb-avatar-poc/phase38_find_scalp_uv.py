import bpy, array

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v18_candidate_v2.glb")

body = bpy.data.objects["Human_export_copy"]
mesh = body.data
uv_layer = mesh.uv_layers.active.data

# Find vertices near the top of the head (high Z, roughly centered X) -- the forehead/scalp region
verts_world = [body.matrix_world @ v.co for v in mesh.vertices]
zs = [v.z for v in verts_world]
z_min, z_max = min(zs), max(zs)
print("head mesh z range:", z_min, z_max)

# Forehead/hairline band: top 8% of the head's Z range, roughly centered (|x| < 0.08)
threshold_z = z_min + (z_max - z_min) * 0.94
candidates_uv = []
for poly in mesh.polygons:
    for li in poly.loop_indices:
        vi = mesh.loops[li].vertex_index
        vw = verts_world[vi]
        if vw.z > threshold_z and abs(vw.x) < 0.10:
            uv = uv_layer[li].uv
            candidates_uv.append((uv.x, uv.y))

if candidates_uv:
    us = [u for u, v in candidates_uv]
    vs = [v for u, v in candidates_uv]
    print(f"Forehead/scalp region UV bounds (0-1 space): U=[{min(us):.4f}, {max(us):.4f}]  V=[{min(vs):.4f}, {max(vs):.4f}]")
    print("sample count:", len(candidates_uv))
else:
    print("NO candidates found -- threshold/filter too strict")

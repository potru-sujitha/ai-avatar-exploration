import bpy, bmesh

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")

obj = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
mesh = obj.data

bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()
bm.faces.ensure_lookup_table()
uv_layer = bm.loops.layers.uv.active

W, H = 2048, 2048
# Full tie region, confirmed by scanning the whole texture for white-dominant cells:
# x in [1408,1984], y in [1024,1856], with a small margin to catch edge-straddling faces.
u0, u1 = 1380 / W, 2000 / H
v0, v1 = 1000 / H, 1880 / H

tie_faces = []
for f in bm.faces:
    for loop in f.loops:
        uv = loop[uv_layer].uv
        if u0 <= uv.x <= u1 and v0 <= uv.y <= v1:
            tie_faces.append(f)
            break

print("deleting", len(tie_faces), "tie faces (full region)")
bmesh.ops.delete(bm, geom=tie_faces, context='FACES')

bm.to_mesh(mesh)
mesh.update()
bm.free()

print("after deletion: verts:", len(mesh.vertices), "polys:", len(mesh.polygons))

bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
    if o.type in ('MESH', 'ARMATURE'):
        o.select_set(True)
bpy.context.view_layer.objects.active = obj
bpy.ops.export_scene.gltf(
    filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase40_test2_deleted.glb",
    export_format='GLB',
    use_selection=True,
    export_animations=False,
)
print("exported phase40_test2_deleted.glb")

import bpy, bmesh, mathutils

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
u0, u1 = 1600 / W, 1930 / W
v0, v1 = 1800 / H, 2048 / H

tie_faces = []
for f in bm.faces:
    for loop in f.loops:
        uv = loop[uv_layer].uv
        if u0 <= uv.x <= u1 and v0 <= uv.y <= v1:
            tie_faces.append(f)
            break

print("deleting", len(tie_faces), "tie faces")
bmesh.ops.delete(bm, geom=tie_faces, context='FACES')

bm.to_mesh(mesh)
mesh.update()
bm.free()

print("after deletion: verts:", len(mesh.vertices), "polys:", len(mesh.polygons))

# Export full avatar (all objects) as a quick test GLB to inspect visually first,
# before committing to the final export-copy pipeline.
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
    if o.type in ('MESH', 'ARMATURE'):
        o.select_set(True)
bpy.context.view_layer.objects.active = obj
bpy.ops.export_scene.gltf(
    filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase40_test_deleted.glb",
    export_format='GLB',
    use_selection=True,
    export_animations=False,
)
print("exported phase40_test_deleted.glb")

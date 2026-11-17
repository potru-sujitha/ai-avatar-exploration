import bpy, json
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v2.glb")

targets = {
  "Human.female_elegantsuit01_export_copy": "Human.female_elegantsuit01_export_copy",
  "Human.teeth_base_export_copy": "Human.teeth_base_export_copy",
}
out = {}
for name in bpy.data.objects.keys():
    pass
for obj in bpy.data.objects:
    if obj.type == 'MESH' and ('elegantsuit' in obj.name or 'teeth_base' in obj.name):
        mesh = obj.data
        n = len(mesh.vertices)
        coords = [0.0]*(n*3)
        mesh.vertices.foreach_get('co', coords)
        xs=coords[0::3]; ys=coords[1::3]; zs=coords[2::3]
        out[obj.name] = {
            "vertex_count": n,
            "polygon_count": len(mesh.polygons),
            "bbox_local": {"min":[min(xs),min(ys),min(zs)], "max":[max(xs),max(ys),max(zs)]},
            "sample_first5verts_xyz": coords[:15],
        }
        print(obj.name, out[obj.name])

with open("reimported_geom.json","w") as f:
    json.dump(out, f, indent=2)

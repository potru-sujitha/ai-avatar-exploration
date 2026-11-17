import bpy, json, sys

bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy.blend")

targets = ["Human.female_elegantsuit01_export_copy", "Human.teeth_base_export_copy", "Human.tongue01_export_copy", "Human_export_copy"]
out = {}
for name in targets:
    obj = bpy.data.objects.get(name)
    if obj is None:
        out[name] = {"error": "not found"}
        print("NOT FOUND:", name)
        continue
    mesh = obj.data
    n = len(mesh.vertices)
    coords = [0.0] * (n * 3)
    mesh.vertices.foreach_get('co', coords)
    # bounding box (local space) + a few sample verts + vertex count + modifier list + shapekey list
    xs = coords[0::3]; ys = coords[1::3]; zs = coords[2::3]
    bbox = {"min": [min(xs), min(ys), min(zs)], "max": [max(xs), max(ys), max(zs)]}
    sample = coords[:15]  # first 5 verts xyz
    sk_names = []
    if mesh.shape_keys:
        sk_names = [kb.name for kb in mesh.shape_keys.key_blocks]
    mods = [(m.name, m.type, getattr(m, 'levels', None)) for m in obj.modifiers]
    out[name] = {
        "vertex_count": n,
        "bbox_local": bbox,
        "sample_first5verts_xyz": sample,
        "shape_keys": sk_names,
        "modifiers": mods,
        "polygon_count": len(mesh.polygons),
    }
    print(name, "verts:", n, "polys:", len(mesh.polygons), "bbox:", bbox, "mods:", mods, "n_shapekeys:", len(sk_names))

with open(r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase3-defect-investigation\blender_native_geom.json", "w") as f:
    json.dump(out, f, indent=2)
print("DONE dump_blender_geom")

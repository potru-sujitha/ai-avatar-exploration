import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v12.glb")

for obj in bpy.data.objects:
    if obj.type == 'MESH' and ('hair' in obj.name.lower() or 'long' in obj.name.lower()):
        print(f"OBJ {obj.name}: verts={len(obj.data.vertices)} polys={len(obj.data.polygons)} "
              f"loc={tuple(round(c,3) for c in obj.location)} rot={tuple(round(c,3) for c in obj.rotation_euler)}")
        # bounding box in world-ish (local) space
        import mathutils
        bbox = [mathutils.Vector(c) for c in obj.bound_box]
        xs = [v.x for v in bbox]; ys = [v.y for v in bbox]; zs = [v.z for v in bbox]
        print(f"  bbox local: x[{min(xs):.3f},{max(xs):.3f}] y[{min(ys):.3f},{max(ys):.3f}] z[{min(zs):.3f},{max(zs):.3f}]")
        print(f"  materials: {[s.material.name if s.material else None for s in obj.material_slots]}")

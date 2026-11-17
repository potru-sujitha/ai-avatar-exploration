import bpy

bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v11.blend")

print("=== Objects using material 'Human.high-poly' ===")
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        for slot in obj.material_slots:
            if slot.material and slot.material.name == "Human.high-poly":
                print(f"Object: {obj.name}  verts={len(obj.data.vertices)}  polys={len(obj.data.polygons)}")
                # check for multiple material slots (could indicate separate cornea sub-material)
                print(f"  all slots: {[s.material.name if s.material else None for s in obj.material_slots]}")

print("\n=== Full Principled BSDF input list for Human.high-poly ===")
mat = bpy.data.materials.get("Human.high-poly")
bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
if bsdf:
    for inp in bsdf.inputs:
        print(f"  {inp.identifier} / '{inp.name}': linked={inp.is_linked}", end="")
        if not inp.is_linked and hasattr(inp, 'default_value'):
            try:
                print(f" default={inp.default_value}")
            except Exception:
                print()
        else:
            print()

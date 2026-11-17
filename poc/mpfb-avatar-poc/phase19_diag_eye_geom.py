import bpy

bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v11.blend")

print("=== All mesh objects with 'eye' in name (case-insensitive) ===")
for obj in bpy.data.objects:
    if obj.type == 'MESH' and 'eye' in obj.name.lower():
        print(f"\nObject: {obj.name}")
        print(f"  vertex count: {len(obj.data.vertices)}")
        print(f"  materials: {[s.material.name if s.material else None for s in obj.material_slots]}")

print("\n=== Material 'Human.high-poly' node graph ===")
mat = bpy.data.materials.get("Human.high-poly")
if mat and mat.use_nodes:
    for node in mat.node_tree.nodes:
        print(f"  Node: {node.name} ({node.type})")
        if node.type == 'BSDF_PRINCIPLED':
            for inp_name in ['Base Color', 'Roughness', 'Specular IOR Level', 'Clearcoat Weight', 'Clearcoat Roughness', 'Transmission Weight', 'IOR']:
                inp = node.inputs.get(inp_name)
                if inp:
                    linked = inp.is_linked
                    val = inp.default_value if hasattr(inp, 'default_value') and not linked else None
                    print(f"    {inp_name}: linked={linked} default={val}")
else:
    print("  Material not found or doesn't use nodes")

print("\n=== All eye-related materials (any name containing eye/cornea/iris/sclera) ===")
for m in bpy.data.materials:
    if any(k in m.name.lower() for k in ['eye', 'cornea', 'iris', 'sclera', 'high-poly']):
        print(f"  Material: {m.name}")

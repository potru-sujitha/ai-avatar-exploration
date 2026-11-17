import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage2_v10.blend")

for matname in ["Human.high-poly", "Human.long01", "Human.body"]:
    mat = bpy.data.materials.get(matname)
    print(f"\n=== {matname} ===")
    if mat is None:
        print("  NOT FOUND")
        continue
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if bsdf:
        print("  Roughness:", bsdf.inputs['Roughness'].default_value)
        print("  Specular IOR Level:", bsdf.inputs['Specular IOR Level'].default_value)
        print("  Subsurface Weight:", bsdf.inputs['Subsurface Weight'].default_value if 'Subsurface Weight' in bsdf.inputs else "N/A")
        print("  Transmission Weight:", bsdf.inputs['Transmission Weight'].default_value if 'Transmission Weight' in bsdf.inputs else "N/A")
        print("  Base Color linked:", bsdf.inputs['Base Color'].is_linked)
    print("  all nodes:", [(n.name, n.type) for n in nt.nodes])
    print("  all images used:", [n.image.name for n in nt.nodes if n.type == 'TEX_IMAGE' and n.image])

# List all mesh objects to find iris/cornea/sclera separation
print("\n=== all mesh objects with 'eye' in name ===")
for o in bpy.data.objects:
    if o.type == 'MESH' and 'eye' in o.name.lower():
        print(" ", o.name, "-> materials:", [slot.material.name if slot.material else None for slot in o.material_slots])

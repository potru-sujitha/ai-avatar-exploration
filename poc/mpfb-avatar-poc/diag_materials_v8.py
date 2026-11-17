import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v7.blend")

for matname in ["Human.toigo_female_suit", "Human.young_caucasian_female"]:
    mat = bpy.data.materials.get(matname)
    if not mat:
        print("MISSING:", matname, "-- trying substring match")
        cands = [m.name for m in bpy.data.materials if matname.split('.')[-1][:10] in m.name]
        print("  candidates:", cands)
        continue
    print("=== ", matname, "===")
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if bsdf:
        print("  Roughness:", bsdf.inputs['Roughness'].default_value)
        try:
            print("  Specular IOR Level:", bsdf.inputs['Specular IOR Level'].default_value)
        except Exception as e:
            print("  Specular input lookup failed:", e)
        try:
            print("  Subsurface Weight:", bsdf.inputs['Subsurface Weight'].default_value)
        except Exception as e:
            print("  Subsurface Weight input missing:", e)
    else:
        print("  no Principled BSDF found")
print("ALL MATERIALS:", sorted(m.name for m in bpy.data.materials if 'suit' in m.name.lower() or 'caucasian' in m.name.lower() or 'skin' in m.name.lower()))

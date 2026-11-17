import bpy, json
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy.blend")

out = {}
for matname in list(bpy.data.materials.keys()):
    mat = bpy.data.materials.get(matname)
    if not mat or not mat.use_nodes:
        continue
    info = {
        "blend_method": getattr(mat, "blend_method", None),
        "alpha_threshold": getattr(mat, "alpha_threshold", None),
        "shadow_method": getattr(mat, "shadow_method", None),
        "use_backface_culling": getattr(mat, "use_backface_culling", None),
    }
    bsdf = None
    for n in mat.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            bsdf = n
    if bsdf:
        a = bsdf.inputs.get('Alpha')
        info["alpha_input_connected"] = a.is_linked if a else None
        info["alpha_default_value"] = a.default_value if a and not a.is_linked else None
    out[matname] = info

with open("alpha_settings.json", "w") as f:
    json.dump(out, f, indent=2)

for name in ["Human.female_elegantsuit01", "Human.teeth_base", "Human.tongue01"]:
    print(name, "->", out.get(name, "NOT FOUND"))

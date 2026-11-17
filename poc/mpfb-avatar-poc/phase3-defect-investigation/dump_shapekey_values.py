import bpy, json

bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy.blend")

targets = ["Human.female_elegantsuit01_export_copy", "Human.teeth_base_export_copy", "Human.tongue01_export_copy", "Human_export_copy",
           "Human.high-poly_export_copy", "Human.eyebrow003_export_copy", "Human.eyelashes02_export_copy", "Human.toigo_blunt_bob_export_copy"]
out = {}
for name in targets:
    obj = bpy.data.objects.get(name)
    if obj is None:
        out[name] = {"error": "not found"}
        continue
    mesh = obj.data
    nonzero = {}
    allvals = {}
    if mesh.shape_keys:
        for kb in mesh.shape_keys.key_blocks:
            allvals[kb.name] = kb.value
            if kb.name != "Basis" and abs(kb.value) > 1e-6:
                nonzero[kb.name] = kb.value
    out[name] = {"all_shapekey_values": allvals, "NONZERO_shapekeys": nonzero}
    print(name, "-> NONZERO:", nonzero if nonzero else "(all zero / none)")

with open(r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase3-defect-investigation\shapekey_values.json", "w") as f:
    json.dump(out, f, indent=2)
print("DONE")

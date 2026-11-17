import bpy
scene = bpy.context.scene
attrs = [a for a in dir(scene) if not a.startswith("__")]
print("TOTAL SCENE ATTRS:", len(attrs))
print("NH_ prefixed:", [a for a in attrs if a.startswith("NH_")])
print("phenotype in name:", [a for a in attrs if "phenotype" in a.lower()])
print("MRP_ prefixed:", [a for a in attrs if a.startswith("MRP_")])
print("ADR_ prefixed:", [a for a in attrs if a.startswith("ADR_")])
print("Any bl_rna property groups (pointer type) mentioning mpfb:")
for a in attrs:
    val = getattr(scene, a, None)
    if "mpfb" in a.lower() or "mpfb" in str(type(val)).lower():
        print(" ", a, type(val))

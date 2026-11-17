import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy.blend")

mat = bpy.data.materials.get("Human.female_elegantsuit01")
print("Blender version:", bpy.app.version_string)
try:
    items = type(mat).bl_rna.properties['blend_method'].enum_items
    print("valid blend_method enum values:", [i.identifier for i in items])
except Exception as e:
    print("ERROR getting enum_items:", e)

print("before:", mat.blend_method)
try:
    mat.blend_method = 'CLIP'
    print("after setting CLIP:", mat.blend_method)
except Exception as e:
    print("EXCEPTION setting CLIP:", e)

try:
    mat.blend_method = 'OPAQUE'
    print("after setting OPAQUE:", mat.blend_method)
except Exception as e:
    print("EXCEPTION setting OPAQUE:", e)

# Check if there's a newer EEVEE-next equivalent property
for propname in ['surface_render_method', 'use_transparent_shadow', 'show_transparent_back']:
    print(propname, "=", getattr(mat, propname, "N/A"))

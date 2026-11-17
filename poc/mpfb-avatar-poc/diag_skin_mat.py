import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v7.blend")
mat = bpy.data.materials.get("Human.body")
nt = mat.node_tree
bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
print("Roughness:", bsdf.inputs['Roughness'].default_value)
print("Specular IOR Level:", bsdf.inputs['Specular IOR Level'].default_value)
print("Subsurface Weight:", bsdf.inputs['Subsurface Weight'].default_value)
print("Subsurface Radius:", list(bsdf.inputs['Subsurface Radius'].default_value) if 'Subsurface Radius' in bsdf.inputs else "N/A")
# which node feeds base color
bc = bsdf.inputs['Base Color']
if bc.is_linked:
    src = bc.links[0].from_node
    print("Base color source node:", src.type, src.name)
    for inp in src.inputs:
        print("   input:", inp.name, "linked:", inp.is_linked, "default:", getattr(inp, 'default_value', None) if not inp.is_linked else None)

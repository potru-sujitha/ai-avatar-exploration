import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage2_v8.blend")
mat = bpy.data.materials.get("Human.body")
nt = mat.node_tree
bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
nm_input = bsdf.inputs.get('Normal')
print("Normal input linked:", nm_input.is_linked)
if nm_input.is_linked:
    src = nm_input.links[0].from_node
    print("source node:", src.type, src.name)
    for inp in src.inputs:
        print("  input:", inp.name, "linked:", inp.is_linked)
        if inp.is_linked:
            print("    from:", inp.links[0].from_node.type, inp.links[0].from_node.name)
# list all image texture nodes on this material
print("all TEX_IMAGE nodes:", [(n.name, n.image.name if n.image else None) for n in nt.nodes if n.type=='TEX_IMAGE'])

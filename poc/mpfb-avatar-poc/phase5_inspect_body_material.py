import bpy

bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v3.blend")

mat = bpy.data.materials.get("Human.body")
print("Material found:", mat is not None)
if mat:
    print("blend_method:", mat.blend_method)
    print("use_nodes:", mat.use_nodes)
    nt = mat.node_tree
    print("Nodes:")
    for n in nt.nodes:
        print(" -", n.name, n.type, n.bl_idname)
        for inp in n.inputs:
            linked = inp.links[0].from_node.name if inp.is_linked else None
            print("     in:", inp.name, "linked_from:", linked, "default:", getattr(inp, "default_value", None))
        for out in n.outputs:
            targets = [l.to_node.name + "." + l.to_socket.name for l in out.links]
            if targets:
                print("     out:", out.name, "-> ", targets)

    bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    print()
    print("Principled BSDF found:", bsdf is not None)
    if bsdf:
        alpha_in = bsdf.inputs.get('Alpha')
        print("Alpha input linked:", alpha_in.is_linked)
        if alpha_in.is_linked:
            src = alpha_in.links[0].from_node
            print("Alpha fed by node:", src.name, src.type)
            if src.type == 'TEX_IMAGE':
                print("Image:", src.image.name if src.image else None)

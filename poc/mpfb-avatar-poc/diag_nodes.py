import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage2_v7.blend")
for matname in ["Human.body", "Human.toigo_blunt_bob", "Human.toigo_female_suit"]:
    mat = bpy.data.materials.get(matname)
    print(f"\n=== {matname} ===")
    if mat is None:
        print("NOT FOUND")
        continue
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    print("BSDF found:", bsdf is not None)
    if bsdf:
        bc = bsdf.inputs['Base Color']
        print("Base Color linked:", bc.is_linked)
        if bc.is_linked:
            src = bc.links[0].from_node
            print("  directly linked from:", src.type, src.name)
    print("All nodes:")
    for n in nt.nodes:
        print(" ", n.type, n.name, "| image:", getattr(n, 'image', None).name if n.type=='TEX_IMAGE' and n.image else "")
    print("All links touching BSDF Base Color or any TEX_IMAGE outputs:")
    for l in nt.links:
        print("  ", l.from_node.name, "->", l.to_node.name, "::", l.to_socket.name)

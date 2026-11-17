import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v4.blend")

for mat_name in ["Human.high-poly"]:
    mat = bpy.data.materials.get(mat_name)
    print(f"\n=== Material: {mat_name} ===  found={mat is not None}")
    if mat is None:
        continue
    nt = mat.node_tree
    print("nodes:")
    for n in nt.nodes:
        print(f"  {n.name} ({n.type}) label={n.label}")
        if n.type == 'TEX_IMAGE' and n.image:
            img = n.image
            print(f"     image: {img.name}, colorspace={img.colorspace_settings.name}, size={img.size[:]}, filepath={img.filepath}")
        if n.type == 'BSDF_PRINCIPLED':
            for inp in n.inputs:
                if inp.is_linked:
                    print(f"     input '{inp.name}' <- {inp.links[0].from_node.name}.{inp.links[0].from_socket.name}")
                else:
                    try:
                        print(f"     input '{inp.name}' = {inp.default_value}")
                    except Exception:
                        pass

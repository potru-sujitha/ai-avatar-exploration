import bpy
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy.blend")

for matname in ["Human.teeth_base", "Human.high-poly", "Human.eyebrow003", "Human.body"]:
    mat = bpy.data.materials.get(matname)
    if not mat or not mat.use_nodes:
        print(matname, "NOT FOUND or no nodes")
        continue
    print(f"\n=== {matname} ===")
    bsdf = None
    for n in mat.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED':
            bsdf = n
        if n.type == 'TEX_IMAGE':
            print(f"  TEX_IMAGE node '{n.name}': image={n.image.name if n.image else None}")
    if bsdf:
        base_color_input = bsdf.inputs.get('Base Color')
        print(f"  Base Color input connected: {base_color_input.is_linked}")
        if base_color_input.is_linked:
            link = base_color_input.links[0]
            print(f"  Base Color linked FROM node: {link.from_node.name} (type={link.from_node.type})")
            # walk back further if it's not directly a TEX_IMAGE (e.g. through a Mix/Math node)
            src = link.from_node
            visited = set()
            while src.type != 'TEX_IMAGE' and src.name not in visited:
                visited.add(src.name)
                found_next = False
                for inp in src.inputs:
                    if inp.is_linked:
                        src = inp.links[0].from_node
                        print(f"    -> traced back through {src.name} (type={src.type})")
                        found_next = True
                        break
                if not found_next:
                    break
        # also check all links into the BSDF for any additional connections (e.g. multiple images mixed)
        print("  all BSDF input links:")
        for inp in bsdf.inputs:
            if inp.is_linked:
                print(f"    {inp.name} <- {inp.links[0].from_node.name} ({inp.links[0].from_node.type})")

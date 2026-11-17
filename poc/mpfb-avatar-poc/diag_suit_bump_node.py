import bpy, sys
sys.path.insert(0, r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc")
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage2_v9.blend")
mat = bpy.data.materials.get("Human.toigo_female_suit")
if mat is None:
    print("MATERIAL NOT FOUND")
else:
    for n in mat.node_tree.nodes:
        if n.type == 'TEX_IMAGE':
            print("TEX_IMAGE node:", repr(n.name), "image:", n.image.name if n.image else None)
        if n.type in ('BUMP', 'NORMAL_MAP'):
            print("BUMP/NORMAL node:", repr(n.name), n.type)

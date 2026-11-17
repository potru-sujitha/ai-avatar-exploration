import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")
for matname in ["Human.high-poly"]:
    mat = bpy.data.materials.get(matname)
    if not mat:
        print(matname, "NOT FOUND")
        continue
    bsdf = None
    for node in mat.node_tree.nodes:
        if node.type == 'BSDF_PRINCIPLED':
            bsdf = node
            break
    if bsdf:
        try:
            cc = bsdf.inputs['Coat Weight'].default_value
        except KeyError:
            cc = bsdf.inputs['Clearcoat'].default_value if 'Clearcoat' in bsdf.inputs else 'N/A'
        print(matname, "clearcoat/coat weight:", cc)

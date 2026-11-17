import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")
suit = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
mat = suit.data.materials[0]
for n in mat.node_tree.nodes:
    if n.type == 'TEX_IMAGE' and n.image and n.image.name == 'Suit2Black_notie_real':
        img = n.image
        out = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase43_diffuse_full.png"
        img.filepath_raw = out
        img.file_format = 'PNG'
        img.save()
        print("saved", img.name, img.size[:], "->", out)

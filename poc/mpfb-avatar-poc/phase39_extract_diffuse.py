import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v18_candidate_v3.glb")
img = bpy.data.images.get("Suit2Black_v2")
img.filepath_raw = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase39_extracted_diffuse.png"
img.file_format = 'PNG'
img.save()
print("saved diffuse, size:", img.size[:])

# Also check mesh objects/names for a separate tie sub-mesh
for obj in bpy.data.objects:
    if obj.type == 'MESH' and 'suit' in obj.name.lower():
        print(f"MESH OBJECT: {obj.name}, verts={len(obj.data.vertices)}, materials={[s.material.name if s.material else None for s in obj.material_slots]}")

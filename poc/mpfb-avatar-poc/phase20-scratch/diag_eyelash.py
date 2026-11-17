import bpy

bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v11.blend")

for obj in bpy.data.objects:
    if obj.type == 'MESH' and 'lash' in obj.name.lower():
        print(f"Object: {obj.name}  verts={len(obj.data.vertices)}")
        for slot in obj.material_slots:
            if slot.material:
                mat = slot.material
                print(f"  Material: {mat.name}  blend_method={getattr(mat,'blend_method','N/A')}")
                bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
                if bsdf:
                    base = bsdf.inputs.get('Base Color')
                    alpha = bsdf.inputs.get('Alpha')
                    print(f"    Base Color linked={base.is_linked}" + (f" default={base.default_value[:]}" if not base.is_linked else ""))
                    print(f"    Alpha linked={alpha.is_linked}" + (f" default={alpha.default_value}" if not alpha.is_linked else ""))
                    if base.is_linked:
                        src = base.links[0].from_node
                        print(f"    Base Color source node: {src.type} {getattr(src,'image',None)}")
                    if alpha.is_linked:
                        src = alpha.links[0].from_node
                        print(f"    Alpha source node: {src.type} {getattr(src,'image',None)}")

import bpy, bmesh
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")
obj = bpy.data.objects.get("Human.toigo_female_suit_2_export_copy")
mesh = obj.data
mat = bpy.data.materials.get("Human.toigo_female_suit_2")
tex_node = None
for node in mat.node_tree.nodes:
    if node.type == 'TEX_IMAGE' and 'Suit2Black' in node.image.name:
        tex_node = node
        break
img = tex_node.image
w, h = img.size
uv_layer = mesh.uv_layers.active.data
# tie UV region in Blender's bottom-up image coords was x:1590-1940, y:1790-2048 out of a known texture size
# convert to normalized UV (v = y/height, with Blender's image.pixels bottom-up matching uv v directly)
u_min, u_max = 1590.0/w, 1940.0/w
v_min, v_max = 1790.0/h, 2048.0/h
count_in_region = 0
z_values = []
for poly in mesh.polygons:
    for li in poly.loop_indices:
        uv = uv_layer[li].uv
        if u_min <= uv.x <= u_max and v_min <= uv.y <= v_max:
            count_in_region += 1
            vert_idx = mesh.loops[li].vertex_index
            co = obj.matrix_world @ mesh.vertices[vert_idx].co
            z_values.append(co.z)
print("texture size:", w, h)
print("loops in tie UV region:", count_in_region)
if z_values:
    print("z range of tie-region verts:", min(z_values), max(z_values))
# compare to a neighboring flat jacket-only region for reference depth
u_min2, u_max2 = 1000.0/w, 1300.0/w
v_min2, v_max2 = 1790.0/h, 2048.0/h
z2 = []
for poly in mesh.polygons:
    for li in poly.loop_indices:
        uv = uv_layer[li].uv
        if u_min2 <= uv.x <= u_max2 and v_min2 <= uv.y <= v_max2:
            vert_idx = mesh.loops[li].vertex_index
            co = obj.matrix_world @ mesh.vertices[vert_idx].co
            z2.append(co.z)
if z2:
    print("z range of jacket-reference verts:", min(z2), max(z2))

import bpy, bmesh, random

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")
suit = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
mesh = suit.data

bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()

visited = {}
components = []
for v0 in bm.verts:
    if v0 in visited:
        continue
    comp_id = len(components)
    comp = {v0}
    stack = [v0]
    while stack:
        v = stack.pop()
        for e in v.link_edges:
            o = e.other_vert(v)
            if o not in comp:
                comp.add(o)
                stack.append(o)
    for v in comp:
        visited[v] = comp_id
    components.append(comp)
print("total components:", len(components))

# flat white body, suit mesh gets one random-colored emission material per disconnected island
body_white = bpy.data.materials.new("BodyWhite")
body_white.use_nodes = True
body_white.node_tree.nodes.clear()
e0 = body_white.node_tree.nodes.new("ShaderNodeEmission")
e0.inputs["Color"].default_value = (0.75, 0.75, 0.75, 1.0)
o0 = body_white.node_tree.nodes.new("ShaderNodeOutputMaterial")
body_white.node_tree.links.new(e0.outputs["Emission"], o0.inputs["Surface"])

for obj in bpy.data.objects:
    if obj.type == 'MESH' and obj is not suit:
        obj.data.materials.clear()
        obj.data.materials.append(body_white)

mesh.materials.clear()
random.seed(42)
comp_mats = []
for i in range(len(components)):
    m = bpy.data.materials.new(f"Island{i}")
    m.use_nodes = True
    m.node_tree.nodes.clear()
    e = m.node_tree.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (random.random()*0.8+0.2, random.random()*0.8+0.2, random.random()*0.8+0.2, 1.0)
    o = m.node_tree.nodes.new("ShaderNodeOutputMaterial")
    m.node_tree.links.new(e.outputs["Emission"], o.inputs["Surface"])
    mesh.materials.append(m)
    comp_mats.append(m)

bm.faces.ensure_lookup_table()
for f in bm.faces:
    # face's island = island of its first vertex (all verts of a face share one island by construction)
    cid = visited[f.verts[0]]
    mesh.polygons[f.index].material_index = cid

cam_data = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_data)
bpy.context.scene.collection.objects.link(cam)
cam.location = (0, -0.38, 1.38)
cam.rotation_euler = (1.5708, 0, 0)
cam_data.lens = 85
bpy.context.scene.camera = cam

scene = bpy.context.scene
try:
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
except TypeError:
    scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.filepath = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase44_rainbow_islands.png"
bpy.ops.render.render(write_still=True)
print("rendered rainbow-island map")
bm.free()

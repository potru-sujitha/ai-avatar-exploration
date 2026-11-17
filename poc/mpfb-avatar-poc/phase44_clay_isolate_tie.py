import bpy, bmesh

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")

clay = bpy.data.materials.new("ClayGrey")
clay.use_nodes = True
bsdf = clay.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Base Color"].default_value = (0.65, 0.65, 0.65, 1.0)
bsdf.inputs["Roughness"].default_value = 0.6

tie_mat = bpy.data.materials.new("TieIslandRed")
tie_mat.use_nodes = True
# Use a pure Emission shader so this material cannot be blown out to white/gray by specular
# highlights under the SUN lights -- unambiguous material-boundary proof, independent of lighting.
tie_mat.node_tree.nodes.clear()
emit = tie_mat.node_tree.nodes.new("ShaderNodeEmission")
emit.inputs["Color"].default_value = (1.0, 0.0, 0.0, 1.0)
emit.inputs["Strength"].default_value = 1.0
out = tie_mat.node_tree.nodes.new("ShaderNodeOutputMaterial")
tie_mat.node_tree.links.new(emit.outputs["Emission"], out.inputs["Surface"])

for obj in bpy.data.objects:
    if obj.type == 'MESH':
        obj.data.materials.clear()
        obj.data.materials.append(clay)

suit = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
mesh = suit.data
mesh.materials.append(tie_mat)  # slot index 1

bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()

# Union of the TWO disconnected islands that together make up the visible "necktie" feature:
# comp containing seed 1848 (the flat blade/strip, 447 verts) and comp containing idx 816
# (the rounded knot blob itself, 442 verts) -- confirmed as separate, mutually-disconnected
# components via full-mesh connectivity analysis.
def flood(seed_idx):
    seed = bm.verts[seed_idx]
    comp = {seed}
    stack = [seed]
    while stack:
        v = stack.pop()
        for e in v.link_edges:
            o = e.other_vert(v)
            if o not in comp:
                comp.add(o)
                stack.append(o)
    return comp

comp = flood(1848) | flood(816)
print("tie island size (blade + knot blob union):", len(comp))

tie_face_idx = [f.index for f in bm.faces if all(v in comp for v in f.verts)]
print("tie island faces:", len(tie_face_idx))
bm.free()

# Assign material slot 1 (red) to those faces directly on the real mesh (not the bmesh copy).
for i in tie_face_idx:
    mesh.polygons[i].material_index = 1

cam_data = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_data)
bpy.context.scene.collection.objects.link(cam)
cam.location = (0, -0.38, 1.38)
cam.rotation_euler = (1.5708, 0, 0)
cam_data.lens = 85
bpy.context.scene.camera = cam

key = bpy.data.lights.new("key", type='SUN')
key.energy = 2.5
keyobj = bpy.data.objects.new("key", key)
keyobj.location = (0.3, -0.6, 1.8)
keyobj.rotation_euler = (0.9, 0, 0.4)
bpy.context.scene.collection.objects.link(keyobj)

fill = bpy.data.lights.new("fill", type='SUN')
fill.energy = 1.2
fillobj = bpy.data.objects.new("fill", fill)
fillobj.location = (-0.3, -0.6, 1.2)
fillobj.rotation_euler = (2.2, 0, -0.4)
bpy.context.scene.collection.objects.link(fillobj)

scene = bpy.context.scene
try:
    scene.render.engine = 'BLENDER_EEVEE_NEXT'
except TypeError:
    scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 800
scene.render.resolution_y = 800
scene.render.filepath = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase44_clay_tie_isolated.png"
bpy.ops.render.render(write_still=True)
print("rendered clay tie-isolation render")

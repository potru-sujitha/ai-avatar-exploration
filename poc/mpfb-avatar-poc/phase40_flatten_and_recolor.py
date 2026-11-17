import bpy, bmesh, mathutils

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v19_candidate.glb")

obj = bpy.data.objects["Human.toigo_female_suit_2_export_copy"]
mesh = obj.data

bm = bmesh.new()
bm.from_mesh(mesh)
bm.verts.ensure_lookup_table()
bm.faces.ensure_lookup_table()
uv_layer = bm.loops.layers.uv.active

W, H = 2048, 2048
u0, u1 = 1380 / W, 2000 / H
v0, v1 = 1000 / H, 1880 / H

region_verts = set()
for f in bm.faces:
    for loop in f.loops:
        uv = loop[uv_layer].uv
        if u0 <= uv.x <= u1 and v0 <= uv.y <= v1:
            for v in f.verts:
                region_verts.add(v)
            break

print("region verts:", len(region_verts))

# Find the actual bulge-only subset: compare each region vertex's position to the
# local average of ITS OWN connected neighbors that are NOT in region_verts (the
# surrounding flat jacket surface), to measure true protrusion per-vertex.
region_idx = {v.index for v in region_verts}
bulge_info = {}
for v in region_verts:
    ext_neighbors = [e.other_vert(v) for e in v.link_edges if e.other_vert(v).index not in region_idx]
    if ext_neighbors:
        avg_pos = sum((n.co for n in ext_neighbors), mathutils.Vector()) / len(ext_neighbors)
        avg_norm = sum((n.normal for n in ext_neighbors), mathutils.Vector())
        avg_norm.normalize()
        d = (v.co - avg_pos).dot(avg_norm) if avg_norm.length > 0 else 0
        bulge_info[v.index] = d

if bulge_info:
    vals = list(bulge_info.values())
    print("bulge stats: min", round(min(vals),4), "max", round(max(vals),4), "mean", round(sum(vals)/len(vals),4))

# Flatten: smooth ALL region vertices toward their full neighbor ring (inside+outside
# region) for several iterations -- this pulls any raised geometry back down onto the
# continuous surrounding surface while leaving topology/UVs/faces fully intact (no holes).
for _ in range(25):
    new_positions = {}
    for v in region_verts:
        neighbors = [e.other_vert(v) for e in v.link_edges]
        if neighbors:
            avg = sum((n.co for n in neighbors), mathutils.Vector()) / len(neighbors)
            new_positions[v.index] = v.co.lerp(avg, 0.5)
    for v in region_verts:
        if v.index in new_positions:
            v.co = new_positions[v.index]

# Re-check bulge after smoothing
bulge_after = {}
for v in region_verts:
    ext_neighbors = [e.other_vert(v) for e in v.link_edges if e.other_vert(v).index not in region_idx]
    if ext_neighbors:
        avg_pos = sum((n.co for n in ext_neighbors), mathutils.Vector()) / len(ext_neighbors)
        avg_norm = sum((n.normal for n in ext_neighbors), mathutils.Vector())
        avg_norm.normalize()
        d = (v.co - avg_pos).dot(avg_norm) if avg_norm.length > 0 else 0
        bulge_after[v.index] = d
if bulge_after:
    vals = list(bulge_after.values())
    print("bulge AFTER smoothing: min", round(min(vals),4), "max", round(max(vals),4), "mean", round(sum(vals)/len(vals),4))

bm.to_mesh(mesh)
mesh.update()
bm.free()

# Recolor the same UV region to the jacket's own black, on the diffuse texture,
# so the now-flattened area blends in as continuous black jacket instead of a
# flat white patch. Find the actual diffuse image node (not spec/normal).
mat = obj.data.materials[0]
diffuse_img = None
for node in mat.node_tree.nodes:
    if node.type == 'TEX_IMAGE' and node.image and 'spec' not in node.image.name.lower() and 'norm' not in node.image.name.lower():
        diffuse_img = node.image
        break
print("diffuse image:", diffuse_img.name if diffuse_img else None)

if diffuse_img:
    pix = list(diffuse_img.pixels)
    Wd, Hd = diffuse_img.size
    # sample jacket black color from a known-black region (e.g. x=200,y=200 corner, generic jacket area)
    sx, sy = 200, 200
    si = (sy*Wd+sx)*4
    jacket_r, jacket_g, jacket_b = pix[si], pix[si+1], pix[si+2]
    print("sampled jacket color:", jacket_r, jacket_g, jacket_b)
    x0p, x1p = int(1380*Wd/W), int(2000*Wd/W)
    y0p, y1p = int(1000*Hd/H), int(1880*Hd/H)
    cnt = 0
    for y in range(y0p, min(y1p, Hd)):
        for x in range(x0p, min(x1p, Wd)):
            i = (y*Wd+x)*4
            pix[i] = jacket_r; pix[i+1] = jacket_g; pix[i+2] = jacket_b
            cnt += 1
    diffuse_img.pixels[:] = pix
    diffuse_img.filepath_raw = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase40-textures\Suit2_notie_recolored.png"
    diffuse_img.file_format = 'PNG'
    diffuse_img.save()
    print("recolored", cnt, "px to jacket black, saved texture")

bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
    if o.type in ('MESH', 'ARMATURE'):
        o.select_set(True)
bpy.context.view_layer.objects.active = obj
bpy.ops.export_scene.gltf(
    filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase40_test3_flattened.glb",
    export_format='GLB',
    use_selection=True,
    export_animations=False,
)
print("exported phase40_test3_flattened.glb")

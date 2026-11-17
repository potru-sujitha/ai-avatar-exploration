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
region_idx = {v.index for v in region_verts}
print("region verts:", len(region_verts))

# Fit ONE global reference plane from all boundary (non-region) vertices directly
# connected to the region -- this represents the surrounding flat jacket surface.
boundary_pts = []
for v in region_verts:
    for e in v.link_edges:
        other = e.other_vert(v)
        if other.index not in region_idx:
            boundary_pts.append(other.co.copy())

if not boundary_pts:
    print("NO boundary points found -- cannot fit plane, aborting flatten")
else:
    centroid = sum(boundary_pts, mathutils.Vector()) / len(boundary_pts)
    # best-fit plane normal via covariance/PCA (smallest-eigenvector), simple approx:
    # use the average normal of the boundary verts' own mesh normals instead (robust enough).
    avg_normal = mathutils.Vector((0,0,0))
    for v in region_verts:
        for e in v.link_edges:
            other = e.other_vert(v)
            if other.index not in region_idx:
                avg_normal += other.normal
    avg_normal.normalize()
    print("plane centroid:", centroid, "normal:", avg_normal)

    max_before = 0
    for v in region_verts:
        d = (v.co - centroid).dot(avg_normal)
        if abs(d) > abs(max_before):
            max_before = d
    print("max offset from plane BEFORE flatten:", round(max_before, 5))

    # Directly project every region vertex onto the fitted plane (remove the component
    # of its position along the plane normal relative to the plane's centroid).
    for v in region_verts:
        d = (v.co - centroid).dot(avg_normal)
        v.co = v.co - d * avg_normal

    max_after = 0
    for v in region_verts:
        d = (v.co - centroid).dot(avg_normal)
        if abs(d) > abs(max_after):
            max_after = d
    print("max offset from plane AFTER flatten:", round(max_after, 5))

bm.to_mesh(mesh)
mesh.update()
bm.free()

# Recolor same region to jacket black (reuse Suit2Black_notie_real, which at this point
# in a fresh import is still the ORIGINAL un-recolored version since this is a fresh
# import of avatar_v19_candidate.glb, not the already-recolored phase40_test3 file).
mat = obj.data.materials[0]
diffuse_img = None
for node in mat.node_tree.nodes:
    if node.type == 'TEX_IMAGE' and node.image and 'spec' not in node.image.name.lower() and 'norm' not in node.image.name.lower():
        diffuse_img = node.image
        break

pix = list(diffuse_img.pixels)
Wd, Hd = diffuse_img.size
sx, sy = 200, 200
si = (sy*Wd+sx)*4
jacket_r, jacket_g, jacket_b = pix[si], pix[si+1], pix[si+2]
x0p, x1p = int(1380*Wd/W), int(2000*Wd/W)
y0p, y1p = int(1000*Hd/H), int(1880*Hd/H)
cnt = 0
for y in range(y0p, min(y1p, Hd)):
    for x in range(x0p, min(x1p, Wd)):
        i = (y*Wd+x)*4
        pix[i] = jacket_r; pix[i+1] = jacket_g; pix[i+2] = jacket_b
        cnt += 1
diffuse_img.pixels[:] = pix
print("recolored", cnt, "px")

bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects:
    if o.type in ('MESH', 'ARMATURE'):
        o.select_set(True)
bpy.context.view_layer.objects.active = obj
bpy.ops.export_scene.gltf(
    filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase40_test4_planeflatten.glb",
    export_format='GLB',
    use_selection=True,
    export_animations=False,
)
print("exported phase40_test4_planeflatten.glb")

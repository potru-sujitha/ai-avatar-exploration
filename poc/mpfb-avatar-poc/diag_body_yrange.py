import bpy
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v11.blend")
body = bpy.data.objects.get("Human_export_copy")
eye = bpy.data.objects.get("Human.high-poly_export_copy")
ebbox = [eye.matrix_world @ Vector(c) for c in eye.bound_box]
eye_y = sum(v.y for v in ebbox)/len(ebbox)
eye_z = sum(v.z for v in ebbox)/len(ebbox)
print(f"eye avg y={eye_y:.4f} z={eye_z:.4f}")

zmin = min((body.matrix_world@v.co).z for v in body.data.vertices)
zmax = max((body.matrix_world@v.co).z for v in body.data.vertices)
thr = zmin + (zmax-zmin)*0.90
pts = [(body.matrix_world@v.co) for v in body.data.vertices if (body.matrix_world@v.co).z > thr]
print(f"points above z={thr:.4f}: {len(pts)}")
ys = [p.y for p in pts]
print(f"their y range: [{min(ys):.4f},{max(ys):.4f}]")
# count how many are "behind" the eye's y (i.e. candidate scalp, not face) assuming more negative/positive = forward
behind_le = sum(1 for y in ys if y <= eye_y)
behind_ge = sum(1 for y in ys if y >= eye_y)
print(f"count y<=eye_y: {behind_le}, count y>=eye_y: {behind_ge}")

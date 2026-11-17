import bpy
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v11.blend")
body = bpy.data.objects.get("Human_export_copy")
bbox = [body.matrix_world @ Vector(c) for c in body.bound_box]
zmin = min(v.z for v in bbox); zmax = max(v.z for v in bbox)
print(f"body z range: [{zmin:.4f}, {zmax:.4f}], height={zmax-zmin:.4f}")
# Also check the actual eye mesh's Z position as a reference for where "head top" should be relative to body
eye = bpy.data.objects.get("Human.high-poly_export_copy")
if eye:
    ebbox = [eye.matrix_world @ Vector(c) for c in eye.bound_box]
    eye_z = sum(v.z for v in ebbox)/len(ebbox)
    print(f"eye mesh avg z: {eye_z:.4f}  -> fraction of body height: {(eye_z-zmin)/(zmax-zmin):.4f}")
# print counts at a few candidate thresholds
for frac in [0.80, 0.85, 0.88, 0.90, 0.92, 0.94]:
    thr = zmin + (zmax-zmin)*frac
    c = sum(1 for v in body.data.vertices if (body.matrix_world @ v.co).z > thr)
    print(f"  frac={frac}: threshold_z={thr:.4f}, points above={c}")

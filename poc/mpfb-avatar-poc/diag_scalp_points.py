import bpy
from mathutils import Vector

SRC_BLEND = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v11.blend"
bpy.ops.wm.open_mainfile(filepath=SRC_BLEND)

head = None
for obj in bpy.data.objects:
    if obj.type == 'MESH' and 'high-poly' in obj.name.lower() and obj.name.endswith('_export_copy'):
        head = obj
        break
print(f"head mesh: {head.name if head else None}")

bbox = [head.matrix_world @ Vector(c) for c in head.bound_box]
zmin = min(v.z for v in bbox); zmax = max(v.z for v in bbox)
xmin = min(v.x for v in bbox); xmax = max(v.x for v in bbox)
ymin = min(v.y for v in bbox); ymax = max(v.y for v in bbox)
print(f"head bbox: x[{xmin:.3f},{xmax:.3f}] y[{ymin:.3f},{ymax:.3f}] z[{zmin:.3f},{zmax:.3f}]")
scalp_z = zmin + (zmax - zmin) * 0.72
print(f"scalp_z_threshold: {scalp_z:.4f} (head height {zmax-zmin:.4f})")

pts = []
for v in head.data.vertices:
    wv = head.matrix_world @ v.co
    if wv.z > scalp_z:
        pts.append(wv)
print(f"scalp points: {len(pts)}")
if pts:
    px0=min(p.x for p in pts); px1=max(p.x for p in pts)
    py0=min(p.y for p in pts); py1=max(p.y for p in pts)
    pz0=min(p.z for p in pts); pz1=max(p.z for p in pts)
    print(f"scalp point extents: x[{px0:.3f},{px1:.3f}] y[{py0:.3f},{py1:.3f}] z[{pz0:.3f},{pz1:.3f}]")
    # bucket by Y (front/back) to see where points actually concentrate
    for lo,hi,label in [(py0, py0+(py1-py0)/3, "front third (low Y)"), (py0+(py1-py0)/3, py0+2*(py1-py0)/3, "middle third"), (py0+2*(py1-py0)/3, py1, "back third (high Y)")]:
        c = sum(1 for p in pts if lo <= p.y < hi+1e-6)
        print(f"  {label} [{lo:.3f},{hi:.3f}]: {c} points")

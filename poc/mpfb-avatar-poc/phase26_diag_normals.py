import bpy, math, random
from mathutils import Vector

bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy_v11.blend")

head = bpy.data.objects.get("Human_export_copy")
eye = bpy.data.objects.get("Human.high-poly_export_copy")
print("head found:", head is not None, "verts:", len(head.data.vertices) if head else None)
print("eye found:", eye is not None)

bbox = [head.matrix_world @ Vector(c) for c in head.bound_box]
zmin = min(v.z for v in bbox); zmax = max(v.z for v in bbox)
scalp_z = zmin + (zmax - zmin) * 0.90
eye_bbox = [eye.matrix_world @ Vector(c) for c in eye.bound_box]
eye_y = sum(v.y for v in eye_bbox) / len(eye_bbox)
print(f"zmin={zmin:.4f} zmax={zmax:.4f} scalp_z={scalp_z:.4f} eye_y={eye_y:.4f}")

nmat = head.matrix_world.to_3x3().inverted().transposed()

scalp = []
for v in head.data.vertices:
    wv = head.matrix_world @ v.co
    if wv.z > scalp_z and wv.y >= eye_y:
        wn = (nmat @ v.normal).normalized()
        scalp.append((wv.copy(), wn.copy()))
print(f"scalp candidate points: {len(scalp)}")

# Sort by z to find true crown (highest points)
scalp_sorted = sorted(scalp, key=lambda p: -p[0].z)
print("\n=== TOP 8 CROWN POINTS: position vs normal vs OLD hardcoded growth dir (0,0,-1) ===")
for wv, wn in scalp_sorted[:8]:
    old_dir = Vector((0, 0, -1))
    dot = wn.dot(old_dir)
    print(f"  pos=({wv.x:.3f},{wv.y:.3f},{wv.z:.3f})  normal=({wn.x:.3f},{wn.y:.3f},{wn.z:.3f})  "
          f"old_growth_dot_normal={dot:.3f}  {'CONFLICT: old growth goes INTO mesh' if dot < -0.3 else ('neutral' if abs(dot) <= 0.3 else 'old growth roughly OK here')}")

n_conflict = sum(1 for wv, wn in scalp if wn.dot(Vector((0,0,-1))) < -0.3)
n_total = len(scalp)
print(f"\nCONCLUSION: {n_conflict}/{n_total} scalp points ({100*n_conflict/n_total:.1f}%) have a surface normal pointing"
      f" UP/OUTWARD such that the OLD hardcoded straight-down growth direction travels INTO the head mesh"
      f" (dot product with normal < -0.3), not away from the surface. This directly confirms the root cause:"
      f" strand growth ignored the local surface normal entirely.")

# Build visual debug markers: small spheres at crown roots + cone arrows along normal (green) and
# along the OLD hardcoded direction (red), for the top 24 crown points, for a rendered screenshot.
random.seed(7)
sample = scalp_sorted[:24]
dbg_coll = bpy.data.collections.new("Phase26_Debug")
bpy.context.scene.collection.children.link(dbg_coll)

mat_green = bpy.data.materials.new("DebugNormal_Green")
mat_green.diffuse_color = (0.1, 1.0, 0.1, 1.0)
mat_red = bpy.data.materials.new("DebugOld_Red")
mat_red.diffuse_color = (1.0, 0.1, 0.1, 1.0)
mat_white = bpy.data.materials.new("DebugRoot_White")
mat_white.diffuse_color = (1.0, 1.0, 1.0, 1.0)

def add_arrow(start, direction, length, mat, name):
    end = start + direction.normalized() * length
    bpy.ops.mesh.primitive_cone_add(radius1=0.004, radius2=0.0, depth=length, location=(start+end)/2)
    obj = bpy.context.active_object
    obj.name = name
    # orient cone (local +Z) to point along direction
    z = Vector((0,0,1))
    axis = z.cross(direction.normalized())
    if axis.length > 1e-6:
        angle = z.angle(direction.normalized())
        obj.rotation_mode = 'AXIS_ANGLE'
        obj.rotation_axis_angle = (angle, axis.x, axis.y, axis.z)
    obj.data.materials.append(mat)
    dbg_coll.objects.link(obj)
    bpy.context.collection.objects.unlink(obj) if obj.name in bpy.context.collection.objects else None
    return obj

for wv, wn in sample:
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.006, location=wv)
    sp = bpy.context.active_object
    sp.data.materials.append(mat_white)
    dbg_coll.objects.link(sp)
    if sp.name in bpy.context.collection.objects:
        bpy.context.collection.objects.unlink(sp)
    add_arrow(wv, wn, 0.05, mat_green, "normal_arrow")
    add_arrow(wv, Vector((0,0,-1)), 0.05, mat_red, "old_dir_arrow")

bpy.ops.wm.save_as_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase26_debug_normals.blend")
print("\nSaved phase26_debug_normals.blend with debug markers (white=root, green=actual surface normal, red=old hardcoded -Z growth dir)")

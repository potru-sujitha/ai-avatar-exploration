"""Diagnostic: open the already-saved export-copy .blend and dump modifier stacks + shape key values
for every mesh, to find the real cause of clothing/mouth defects. Read-only, no changes saved."""
import bpy

bpy.ops.wm.open_mainfile(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_stage3_exportcopy.blend")

print("\n=== ALL OBJECTS ===")
for o in bpy.data.objects:
    print(f"- {o.name} (type={o.type}, parent={o.parent.name if o.parent else None})")

print("\n=== MESH OBJECTS: modifiers + shape keys ===")
for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    print(f"\n--- {o.name} ---")
    print("  vertex count:", len(o.data.vertices))
    print("  modifiers:")
    for m in o.modifiers:
        extra = {}
        for attr in ("object", "vertex_group", "invert_vertex_group", "levels", "render_levels"):
            if hasattr(m, attr):
                val = getattr(m, attr)
                extra[attr] = val.name if hasattr(val, "name") else val
        print(f"    - {m.name} (type={m.type}) {extra}")
    if o.data.shape_keys:
        print("  shape keys (name=value):")
        for kb in o.data.shape_keys.key_blocks:
            if kb.value != 0.0:
                print(f"    * NONZERO: {kb.name} = {kb.value}")
        total = len(o.data.shape_keys.key_blocks)
        nonzero = sum(1 for kb in o.data.shape_keys.key_blocks if kb.value != 0.0)
        print(f"    (total shape keys: {total}, nonzero: {nonzero})")
    print("  material slots:")
    for i, slot in enumerate(o.material_slots):
        mat = slot.material
        print(f"    [{i}] {mat.name if mat else 'EMPTY'}")
    print("  vertex groups count:", len(o.vertex_groups))
    print("  UV layers:", [uv.name for uv in o.data.uv_layers])

print("\n=== DONE ===")

"""
Phase 5: test a given alpha-clip threshold on Human.body in isolation.
Usage: blender --background --python phase5_body_threshold_test.py -- <threshold> <out_glb_name>
"""
import bpy, sys
from pathlib import Path

argv = sys.argv[sys.argv.index("--") + 1:]
threshold = float(argv[0])
out_name = argv[1]
POC_DIR = Path(r"C:/Users/sujitha/talking-avatar/poc/mpfb-avatar-poc")

bpy.ops.wm.open_mainfile(filepath=str(POC_DIR / "avatar_stage3_exportcopy_v3.blend"))

mat = bpy.data.materials.get("Human.body")
nt = mat.node_tree
bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
alpha_in = bsdf.inputs['Alpha']
link = alpha_in.links[0]
src_socket = link.from_socket
nt.links.remove(link)
math_node = nt.nodes.new('ShaderNodeMath')
math_node.operation = 'GREATER_THAN'
math_node.label = f"Phase5_BodyAlphaTest_{threshold}"
math_node.inputs[1].default_value = threshold
nt.links.new(src_socket, math_node.inputs[0])
nt.links.new(math_node.outputs['Value'], alpha_in)
print(f"inserted GREATER_THAN threshold={threshold} on Human.body")

# Export body mesh alone + armature (isolated, matches Phase 3/4's minimal-repro pattern)
body_obj = None
arm_obj = None
for o in bpy.data.objects:
    if o.name == "Human_export_copy":
        body_obj = o
    if o.type == 'ARMATURE' and "export_copy" in o.name.lower() or (o.type == 'ARMATURE' and body_obj and o.name == body_obj.parent.name if body_obj and body_obj.parent else False):
        pass
# more robust: find the armature that is body_obj's armature modifier target
if body_obj is None:
    for o in bpy.data.objects:
        if o.type == 'MESH' and o.data.materials and any(m and m.name == "Human.body" for m in o.data.materials):
            body_obj = o
            break
print("body_obj:", body_obj.name if body_obj else None)
for m in body_obj.modifiers:
    if m.type == 'ARMATURE':
        arm_obj = m.object
        break
print("arm_obj:", arm_obj.name if arm_obj else None)

bpy.ops.object.select_all(action='DESELECT')
body_obj.select_set(True)
if arm_obj:
    arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj if arm_obj else body_obj

out_path = str(POC_DIR / out_name)
bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', use_selection=True, export_animations=False)
print("exported", out_path)

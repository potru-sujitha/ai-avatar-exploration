"""
Phase 22: quick visual screening test for the one genuinely new, untested long-hair
candidate found in the installed MPFB catalog (culturalibre_hair_01/02 excluded: AGPL3
license, same category this investigation rejected a skin asset for in Phase 16;
culturalibre_hair_05/06 excluded by shape alone -- short/chunky cap styles, not long hair,
confirmed by viewing their own thumbnails directly, not assumed from name).
faydaen_hair_1: long, swept hairstyle by thumbnail shape, but flagged by two independent,
direct technical findings before any render: (1) its only texture (hair.png) is RGB with
NO ALPHA CHANNEL AT ALL -- confirmed via `file` command -- meaning every hair card can only
render as a fully opaque, hard-edged shape, structurally worse than Long01's 72.5%-opaque-
but-alpha-capable texture; (2) its mesh is very low-poly (541 verts / 836 faces vs. Long01's
3239), meaning very few, very large card shapes. Both predict a blocky result. Rendering it
anyway, per this phase's own explicit rule: appearance decides, not a pre-render metric.
"""
import bpy
from mathutils import Color

# Clear the default scene objects (cube/camera/light) without a factory-settings reset,
# which would also tear down MPFB's own addon registration that Blender's normal startup
# already performs.
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

from bl_ext.user_default.mpfb.services.assetservice import AssetService
AssetService.update_all_asset_lists()

stage = lambda n: print(f"\n=== {n} ===")

stage("find the real faydaen asset label (don't guess)")
hair_items = AssetService.get_asset_list("hair", "mhclo")
faydaen_label = next((k for k in hair_items if "faydaen" in k.lower()), None)
print("hair catalog labels containing 'faydaen':", faydaen_label)
if not faydaen_label:
    print("ALL hair labels:", sorted(hair_items.keys()))
    raise RuntimeError("faydaen label not found")

stage("create a quick adult female human (no full rig/suit needed for this screening test)")
bpy.context.scene.MPFB_NH_add_phenotype = True
bpy.context.scene.MPFB_NH_phenotype_gender = "female"
bpy.context.scene.MPFB_NH_phenotype_age = "young"
bpy.context.scene.MPFB_NH_phenotype_race = "caucasian"
bpy.ops.mpfb.create_human()
human = bpy.context.view_layer.objects.active
print("human created:", human)

stage("add TalkingHead custom rig (required before MPFB will attach hair)")
bpy.context.scene.MPFB_ADR_custom_rig = "talkinghead"
bpy.context.scene.MPFB_ADR_import_weights_custom = True
bpy.ops.mpfb.add_custom_rig()
print("rig added")

stage("apply skin (for believable scalp/face tone context)")
skin_items = AssetService.get_asset_list("skins", "mhmat")
skin_path = skin_items["Young caucasian female"]["full_path"]
bpy.context.view_layer.objects.active = human
human.select_set(True)
bpy.ops.mpfb.load_library_skin(filepath=skin_path)

stage(f"apply hair: {faydaen_label}")
hair_path = hair_items[faydaen_label]["full_path"]
bpy.context.view_layer.objects.active = human
human.select_set(True)
bpy.ops.mpfb.load_library_clothes(filepath=hair_path, object_type="Hair", material_type="MAKESKIN")
print("hair applied")

stage("recolor hair toward medium brown (Lab-space hue shift on the material's own color, quick in-shader approach for this screening test)")
hair_obj = None
for obj in bpy.data.objects:
    if obj.type == 'MESH' and any('hair' in (s.material.name.lower() if s.material else '') for s in obj.material_slots):
        hair_obj = obj
        break
if hair_obj:
    print("hair object found:", hair_obj.name, "verts:", len(hair_obj.data.vertices))
    for slot in hair_obj.material_slots:
        if slot.material:
            mat = slot.material
            print("hair material:", mat.name)
            bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if bsdf:
                base_color_input = bsdf.inputs.get('Base Color')
                tex_node = None
                if base_color_input.is_linked:
                    tex_node = base_color_input.links[0].from_node
                print("  base color linked:", base_color_input.is_linked, "tex node:", tex_node.name if tex_node else None)
                # Insert a Hue/Saturation node between the texture and the BSDF to push toward
                # medium brown without flattening lightness (same principle as every recolor
                # in this investigation -- shift hue/chroma, preserve the texture's own
                # lightness/highlight detail).
                if tex_node:
                    hue_node = mat.node_tree.nodes.new('ShaderNodeHueSaturation')
                    hue_node.inputs['Hue'].default_value = 0.52  # shift toward neutral brown
                    hue_node.inputs['Saturation'].default_value = 0.85
                    hue_node.inputs['Value'].default_value = 0.95
                    mat.node_tree.links.new(tex_node.outputs['Color'], hue_node.inputs['Color'])
                    mat.node_tree.links.new(hue_node.outputs['Color'], base_color_input)
                    print("  hue/sat correction node inserted")

stage("set up camera and light for a quick front-view Cycles render")
bpy.ops.object.camera_add(location=(0, -2.2, 1.55), rotation=(1.4, 0, 0))
cam = bpy.context.object
bpy.context.scene.camera = cam
bpy.ops.object.light_add(type='SUN', location=(0, -1, 3))
bpy.context.object.data.energy = 3

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.render.resolution_x = 700
scene.render.resolution_y = 700
scene.render.filepath = str(__import__('pathlib').Path(r"C:/Users/sujitha/talking-avatar/poc/mpfb-avatar-poc/phase22_faydaen_render.png"))
bpy.ops.render.render(write_still=True)
print("\nRENDER SAVED to phase22_faydaen_render.png")

"""
Phase 16: render each candidate female suit on the same rigged human, for direct
collar/lapel structure comparison against the reference image. Fast EEVEE viewport-style
renders, not a full GLB export -- this is a visual comparison tool only.
"""
import bpy, sys, zipfile, shutil, importlib.util
from pathlib import Path

POC_DIR = Path(r"C:/Users/sujitha/talking-avatar/poc/mpfb-avatar-poc")
ASSETS_DIR = POC_DIR / "assetpacks"
TH_MPFB_DIR = Path(r"C:/Users/sujitha/talking-avatar/poc/talkinghead-poc/TalkingHead/blender/MPFB")
OUT_DIR = POC_DIR / "phase16-suit-compare"
OUT_DIR.mkdir(exist_ok=True)

from bl_ext.user_default.mpfb.services.locationservice import LocationService
from bl_ext.user_default.mpfb.services.assetservice import AssetService
data_dir = Path(LocationService.get_user_data())

pack_files = {
    "system_assets.zip": ASSETS_DIR / "system_assets.zip",
    "suits01.zip": ASSETS_DIR / "suits01.zip",
    "skins01.zip": ASSETS_DIR / "skins01.zip",
    "hair01.zip": ASSETS_DIR / "hair01.zip",
}
for label, zpath in pack_files.items():
    if zpath.exists():
        with zipfile.ZipFile(zpath, "r") as zf:
            zf.extractall(data_dir)
AssetService.update_all_asset_lists()

th_local = POC_DIR / "talkinghead_blender"
th_local.mkdir(exist_ok=True)
for fname in ["talkinghead-addon.py", "talkinghead.mpfbskel", "talkinghead.mhw"]:
    src = TH_MPFB_DIR / fname
    if src.exists():
        shutil.copy(src, th_local / fname)
spec = importlib.util.spec_from_file_location("talkinghead_addon", str(th_local / "talkinghead-addon.py"))
th_addon = importlib.util.module_from_spec(spec)
sys.modules["talkinghead_addon"] = th_addon
spec.loader.exec_module(th_addon)
th_addon.register()

# Dummy -> rig library (same as build script)
bpy.ops.object.select_all(action='DESELECT')
bpy.context.scene.MPFB_NH_add_phenotype = False
bpy.ops.mpfb.create_human()
bpy.ops.mpfb.load_rig(filepath=str(th_local / "talkinghead.mpfbskel"))
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.mpfb.load_weights(filepath=str(th_local / "talkinghead.mhw"))
bpy.context.scene.MPFB_MRP_library_rig_name = "talkinghead"
bpy.context.scene.MPFB_MRP_library_identifying_bones = "LeftToe_End"
bpy.context.scene.MPFB_MRP_library_also_save_weights = True
bpy.ops.mpfb.save_rig_to_library()
bpy.ops.object.select_all(action='DESELECT')
for o in list(bpy.data.objects):
    o.select_set(True)
bpy.ops.object.delete()

# Real human
bpy.context.scene.MPFB_NH_add_phenotype = True
bpy.context.scene.MPFB_NH_phenotype_gender = "female"
bpy.context.scene.MPFB_NH_phenotype_age = "young"
bpy.context.scene.MPFB_NH_phenotype_race = "caucasian"
bpy.ops.mpfb.create_human()
human = bpy.context.view_layer.objects.active

bpy.context.scene.MPFB_ADR_custom_rig = "talkinghead"
bpy.context.scene.MPFB_ADR_import_weights_custom = True
bpy.ops.mpfb.add_custom_rig()

skin_path = AssetService.get_asset_list("skins", "mhmat")["Young caucasian female"]["full_path"]
bpy.context.view_layer.objects.active = human
human.select_set(True)
bpy.ops.mpfb.load_library_skin(filepath=skin_path)

def apply_clothes(label):
    items = AssetService.get_asset_list("clothes", "mhclo")
    path = items[label]["full_path"]
    bpy.context.view_layer.objects.active = human
    human.select_set(True)
    bpy.ops.mpfb.load_library_clothes(filepath=path, object_type="Clothes", material_type="MAKESKIN")
    # find the newly added clothes object (not human, not armature)
    new_obj = None
    for o in bpy.data.objects:
        if o.type == 'MESH' and o != human and o.parent == human:
            new_obj = o
    return new_obj

# Camera + light setup (upper body, front)
cam_data = bpy.data.cameras.new("CompareCam")
cam_obj = bpy.data.objects.new("CompareCam", cam_data)
bpy.context.collection.objects.link(cam_obj)
cam_obj.location = (0, -2.2, 1.35)
cam_obj.rotation_euler = (1.4835, 0, 0)
cam_data.lens = 50
bpy.context.scene.camera = cam_obj

light_data = bpy.data.lights.new("CompareLight", type='SUN')
light_data.energy = 3
light_obj = bpy.data.objects.new("CompareLight", light_data)
bpy.context.collection.objects.link(light_obj)
light_obj.rotation_euler = (1.1, 0, 0.6)

bpy.context.scene.render.engine = 'BLENDER_EEVEE_NEXT'
bpy.context.scene.render.resolution_x = 500
bpy.context.scene.render.resolution_y = 650

CANDIDATES = [
    "Female casualsuit01",
    "Female casualsuit02",
    "Female elegantsuit01",
    "Toigo female suit 2",
    "Toigo female double-breasted suit",
]

for label in CANDIDATES:
    try:
        obj = apply_clothes(label)
        bpy.context.view_layer.update()
        safe = label.replace(" ", "_").replace("-", "_")
        out_path = str(OUT_DIR / f"{safe}.png")
        bpy.context.scene.render.filepath = out_path
        bpy.ops.render.render(write_still=True)
        print(f"RENDERED {label} -> {out_path}")
        if obj:
            bpy.data.objects.remove(obj, do_unlink=True)
    except Exception as e:
        print(f"FAILED {label}: {e}")

print("DONE_PHASE16_SUIT_COMPARE")

import bpy, sys, zipfile, shutil, importlib.util
from pathlib import Path
POC_DIR = Path(r"C:/Users/sujitha/talking-avatar/poc/mpfb-avatar-poc")
ASSETS_DIR = POC_DIR / "assetpacks"
TH_MPFB_DIR = Path(r"C:/Users/sujitha/talking-avatar/poc/talkinghead-poc/TalkingHead/blender/MPFB")

from bl_ext.user_default.mpfb.services.locationservice import LocationService
from bl_ext.user_default.mpfb.services.assetservice import AssetService
data_dir = Path(LocationService.get_user_data())
for zip_name, zpath in {"system_assets.zip": ASSETS_DIR/"system_assets.zip", "suits01.zip": ASSETS_DIR/"suits01.zip"}.items():
    if zpath.exists():
        with zipfile.ZipFile(zpath, "r") as zf: zf.extractall(data_dir)
AssetService.update_all_asset_lists()

th_local = POC_DIR / "talkinghead_blender"
spec = importlib.util.spec_from_file_location("talkinghead_addon", str(th_local / "talkinghead-addon.py"))
th_addon = importlib.util.module_from_spec(spec)
sys.modules["talkinghead_addon"] = th_addon
spec.loader.exec_module(th_addon)
th_addon.register()

bpy.ops.object.select_all(action='DESELECT')
bpy.context.scene.MPFB_NH_add_phenotype = True
bpy.context.scene.MPFB_NH_phenotype_gender = "female"
bpy.ops.mpfb.create_human()
human = bpy.context.view_layer.objects.active

bpy.context.scene.MPFB_ADR_custom_rig = "talkinghead"
bpy.context.scene.MPFB_ADR_import_weights_custom = True
bpy.ops.mpfb.add_custom_rig()

items = AssetService.get_asset_list("clothes", "mhclo")
path = items["Toigo female suit 2"]["full_path"]
bpy.context.view_layer.objects.active = human
human.select_set(True)
bpy.ops.mpfb.load_library_clothes(filepath=path, object_type="Clothes", material_type="MAKESKIN")

print("MATERIALS:", sorted(m.name for m in bpy.data.materials))
for m in bpy.data.materials:
    if "suit" in m.name.lower() or "2" in m.name:
        print(f"--- {m.name} nodes ---")
        for n in m.node_tree.nodes:
            img = n.image.name if n.type == 'TEX_IMAGE' and n.image else None
            print(" ", n.name, n.type, img)
print("DONE_DIAG")

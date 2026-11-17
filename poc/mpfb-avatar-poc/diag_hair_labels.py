import bpy, importlib
from bl_ext.user_default.mpfb.services.assetservice import AssetService
AssetService.update_all_asset_lists()
items = AssetService.get_asset_list("hair", "mhclo")
for k in sorted(items.keys()):
    if "long" in k.lower():
        print("HAIR_LABEL:", repr(k))

import bpy
from bl_ext.user_default.mpfb.services.assetservice import AssetService
items = AssetService.get_asset_list("clothes", "mhclo")
for k in sorted(items.keys()):
    if "suit" in k.lower() or "elegant" in k.lower():
        print("LABEL:", repr(k), "->", items[k]["full_path"])

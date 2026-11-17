import bpy
from bl_ext.user_default.mpfb.services.assetservice import AssetService
items = AssetService.get_asset_list("clothes", "mhclo")
suits = {k: v["full_path"] for k, v in items.items() if "suit" in k.lower()}
print("SUIT_LABELS_START")
for k in sorted(suits):
    print(k, "->", suits[k])
print("SUIT_LABELS_END")

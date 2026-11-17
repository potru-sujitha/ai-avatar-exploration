import bpy
from bl_ext.user_default.mpfb.services.assetservice import AssetService

def dump(label, kind):
    try:
        items = AssetService.get_asset_list(kind)
        names = sorted([getattr(i, "name", str(i)) for i in items])
        print(f"\n=== {label} ({len(names)}) ===")
        for n in names:
            print(" ", n)
    except Exception as e:
        print(f"  {label}: ERROR {e}")

dump("skins", "skins")
dump("hair", "hair")
dump("clothes", "clothes")
dump("eyes", "eyes")
dump("eyebrows", "eyebrows")
dump("eyelashes", "eyelashes")
dump("teeth", "teeth")
dump("tongue", "tongue")

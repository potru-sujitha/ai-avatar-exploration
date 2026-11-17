import bpy
from bl_ext.user_default.mpfb.services.assetservice import AssetService
AssetService.update_all_asset_lists()
bpy.context.scene.MPFB_NH_add_phenotype = True
bpy.context.scene.MPFB_NH_phenotype_gender = "female"
bpy.context.scene.MPFB_NH_phenotype_age = "young"
bpy.context.scene.MPFB_NH_phenotype_race = "caucasian"
bpy.ops.mpfb.create_human()
skins = AssetService.get_asset_list("skins")
print("ALL SKINS:", sorted([getattr(s, "name", str(s)) for s in skins]))

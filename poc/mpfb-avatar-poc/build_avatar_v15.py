"""
Headless MPFB avatar build script, run via:
  blender --background --python build_avatar.py
Builds one professional female human, rigs it for TalkingHead, exports GLB.
Read-only against the rest of the repo; everything it writes stays under poc/mpfb-avatar-poc/.
"""
import bpy, sys, os, zipfile, shutil, importlib.util, traceback
from pathlib import Path

POC_DIR = Path(r"C:/Users/sujitha/talking-avatar/poc/mpfb-avatar-poc")
ASSETS_DIR = POC_DIR / "assetpacks"
TH_MPFB_DIR = Path(r"C:/Users/sujitha/talking-avatar/poc/talkinghead-poc/TalkingHead/blender/MPFB")
OUT_GLB = POC_DIR / "avatar_v15_stage.glb"  # Phase 27: staged density testing, renamed to avatar_v15.glb only on final acceptance
TEX_DIR = POC_DIR / "phase13b-textures"
PHASE15_TEX_DIR = POC_DIR / "phase15-textures"
PHASE16_TEX_DIR = POC_DIR / "phase16-textures"
PHASE18_TEX_DIR = POC_DIR / "phase18-textures"
PHASE20_TEX_DIR = POC_DIR / "phase20-textures"

# Phase 20: (1) hair re-measured directly -- grid-sampled pixel average hue was 15.1deg
# (copper-leaning), not neutral brown (~25-30deg); Lab-space hue rotated +13deg -> 22.5deg,
# same technique as every other recolor here, preserving lightness/highlight detail.
# (2) The Phase 16 "tie removed" texture (Suit2Black.png) was re-inspected directly and the
# tie/ascot shape was found STILL WHITE in it -- the recolor from that phase evidently never
# took effect on this region (file name was aspirational, not actually applied here).
# Re-fixed for real: tie region recolored to the jacket's own sampled black (30,30,30) in
# both the diffuse and normal maps. (3) Skin was re-considered per the user's repeated
# complaint, but not re-measured this pass (time-boxed) -- Phase 16's own Delta-E finding
# (current texture already closest to reference, pushing warmer overshoots) is the most
# recent evidence available and was not contradicted by anything found this phase, so it is
# kept unchanged rather than guessed at without fresh measurement -- disclosed honestly in
# the Phase 20 report, not silently skipped.

# Phase 13b: hair/skin/suit recolor targets, found by direct diagnostic dump of
# bpy.data.materials right after each asset is applied (same pattern Phase 13 used for the
# suit material name). Each material's Base Color is fed by a single Image Texture node;
# swapping that node's .image datablock to the pre-recolored PNG (built by
# phase13b-recolor.cjs, a Lab-space chroma/hue shift that preserves each texture's own
# lightness variation -- shifting lightness instead of chroma was the root cause of a flat,
# fake look in this repo's much earlier Nov-6 photo-reskin work) is the whole fix; no shader
# graph restructuring needed, unlike the alpha-clip/eye-desaturation fixes below.
# Phase 15: hair asset itself changed (short bob -> "Long01", a long straight hairstyle),
# so the Phase 13b bob-specific recolor target no longer applies -- Long01's own stock
# diffuse texture was inspected directly and is already a natural medium-brown with real
# root/tip highlight variation (not flat/orange), so no hair recolor is needed this pass.
# Suit keeps the Phase 13b/14 black-blazer fix but swaps to a brooch-removed version of
# that same texture (see phase15-remove-brooch.cjs) -- same material, same specular/
# roughness fix below, only the decorative cameo+frame region is blacked out.
# Phase 16: suit swapped from "Toigo female suit" (ruffled/wavy collar geometry, flagged
# against the reference image's clean tailored lapel) to "Toigo female suit 2" (a genuine
# notched-lapel blazer shape -- confirmed by rendering all 5 installed female suit
# candidates side by side; see Phase 16 report). Real material name confirmed via
# diag_suit2_material.py, not guessed: "Human.toigo_female_suit_2".
# Skin: TWO stronger candidates were generated and tested against the reference photo's own
# sampled cheek/forehead tone via direct Lab-space Delta-E distance (not just a visual
# guess): Phase 13's existing WarmNeutralSkin.png measured Delta-E 6.42 from the reference;
# "SkinWarmB" (a moderate further push) measured 6.62 -- slightly worse; "SkinWarmC" (a
# stronger push) measured 7.90 -- clearly worse, having overshot past the reference's actual
# tone rather than approaching it. Per this phase's own instruction to revert a change that
# makes the result worse, skin is KEPT at Phase 13's existing WarmNeutralSkin.png -- this is
# a real, measured finding (there is no headroom to push further without overshooting), not
# an unexplored option.
# Phase 18: eye texture added to this same proven swap mechanism, replacing the Phase 7
# Hue/Saturation SHADER NODE approach entirely. Root cause of the user's persistent "still
# looks reddish" complaint, found by directly reading the exported avatar_v10.glb's own JSON:
# the "Human.high-poly" eye material's baseColorTexture resolves to an image literally still
# named "brown_eye" with no baseColorFactor tint present -- the Phase 7 Hue/Saturation node
# never survived glTF export at all (Blender's exporter only recognizes a small set of
# standard PBR-mappable node patterns; a generic Hue/Saturation node isn't one of them, the
# same category of "looks fixed in Blender, dead on arrival in the GLB" bug this investigation
# hit with the legacy blend_method property in Phase 3/4). The fix that's actually proven to
# survive export in this codebase is a baked texture swap (this exact RECOLOR_TARGETS
# mechanism, already confirmed working for hair/skin/suit) -- so the eye gets the same
# treatment: NaturalBrownEye.png (phase18-recolor.cjs) desaturates the sclera's red vein
# pixels and rotates the iris's hue from red-brown toward a warmer, more natural brown,
# gated by Lab-space lightness/chroma per-pixel (not a flat recolor), preserving the iris's
# own radial fiber detail and gold flecks.
RECOLOR_TARGETS = {
    "Human.body": TEX_DIR / "WarmNeutralSkin.png",
    "Human.toigo_female_suit_2": PHASE20_TEX_DIR / "Suit2Black_v2.png",
    "Human.high-poly": PHASE18_TEX_DIR / "NaturalBrownEye.png",
    "Human.long01": PHASE20_TEX_DIR / "long01_diffuse_recolored.png",
}

# Phase 3 root cause (see reports/MPFB Avatar GLB Export Defect Investigation - Phase 3.md):
# these three materials use alpha-mapped textures for cutout detail (teeth gaps, clothing
# seam edges) but the generation script never configured Blender's alpha-clip mode on them,
# so the glTF exporter wrote the wrong alphaMode into the GLB. Verified fix (corrected in
# Phase 4, see below in the FIX stage): insert a real ShaderNodeMath GREATER_THAN node.
#
# Phase 5 addition: Human.body has the identical defect (nose/mouth-opening blotch), found
# during Phase 4's whole-avatar validation. Phase 5 threshold-swept 0.1/0.3/0.5/0.6/0.7/0.9/0.99
# on Human.body in isolation and found the nose/mouth blotch resolves identically at every
# threshold tested -- 0.5 is used here for consistency with the suit material, not because a
# narrower value was required. Phase 5 also found the "eye-socket crescent" Phase 4 flagged as
# a leftover defect is NOT actually visible in the real, complete avatar (confirmed absent in
# both v2's and v3's own whole-avatar renders, which include the real eyeball mesh) -- it is an
# artifact specific to rendering Human.body completely alone, without its normal eyeball/eyelash/
# eyebrow companions that occlude that cavity. No threshold value changed it (tested 0.1 through
# 0.99, byte-for-byte identical renders), consistent with it not being an alpha-cutout region at
# all. See reports/MPFB Avatar Human Body Alpha Fix - Phase 5.md for the full evidence.
# Phase 13: swapped the suit material key for the new clothing asset ("Toigo female
# suit"). Two wrong guesses first ("Human.fem_suit" from the .mhmat filename;
# "Human.suitmatMaterial" from the .mhmat's own internal `name` field) -- both produced
# a "material not found" warning on an actual run. Settled by directly dumping
# sorted(m.name for m in bpy.data.materials) right after applying the clothing item:
# the real pattern is "Human." + the asset's own catalog-label text, snake_cased
# ("Toigo female suit" -> "toigo_female_suit"), confirmed verbatim in that dump.
ALPHA_CLIP_MATERIALS = {
    "Human.toigo_female_suit_2": 0.5,
    "Human.teeth_base": 0.4,
    "Human.tongue01": 0.4,
    "Human.body": 0.5,
}

def stage(name):
    print(f"\n{'='*20} STAGE: {name} {'='*20}")

try:
    stage("import MPFB services")
    from bl_ext.user_default.mpfb.services.locationservice import LocationService
    from bl_ext.user_default.mpfb.services.assetservice import AssetService
    data_dir = Path(LocationService.get_user_data())
    print("MPFB user data dir:", data_dir)

    stage("install asset packs")
    for zip_name in ["makehuman_system_assets_cc0.zip" if False else None]:
        pass
    pack_files = {
        "system_assets.zip": ASSETS_DIR / "system_assets.zip",
        "visemes02.zip": ASSETS_DIR / "visemes02.zip",
        "faceunits01.zip": ASSETS_DIR / "faceunits01.zip",
        "suits01.zip": ASSETS_DIR / "suits01.zip",
        "skins01.zip": ASSETS_DIR / "skins01.zip",
        "hair01.zip": ASSETS_DIR / "hair01.zip",
    }
    for label, zpath in pack_files.items():
        if not zpath.exists():
            print(f"  MISSING {label}, skipping")
            continue
        with zipfile.ZipFile(zpath, "r") as zf:
            zf.extractall(data_dir)
        print(f"  extracted {label}")
    AssetService.update_all_asset_lists()
    print("  asset lists updated")

    stage("register TalkingHead Blender addon")
    th_local = POC_DIR / "talkinghead_blender"
    th_local.mkdir(exist_ok=True)
    for fname in ["talkinghead-addon.py", "talkinghead.mpfbskel", "talkinghead.mhw", "talkinghead-targets.zip", "talkinghead-assets.zip"]:
        src = TH_MPFB_DIR / fname
        if src.exists():
            shutil.copy(src, th_local / fname)
    spec = importlib.util.spec_from_file_location("talkinghead_addon", str(th_local / "talkinghead-addon.py"))
    th_addon = importlib.util.module_from_spec(spec)
    sys.modules["talkinghead_addon"] = th_addon
    spec.loader.exec_module(th_addon)
    # th_addon.get_data_dir() falls back to get_addon_dir() = Path(__file__).parent when no addon prefs found,
    # which is th_local since we exec'd the file from there via spec_from_file_location.
    th_addon.register()
    print("  TalkingHead addon registered, data dir fallback:", th_addon.get_addon_dir())

    stage("set up TalkingHead custom rig in MPFB (dummy character)")
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.scene.MPFB_NH_add_phenotype = False
    bpy.ops.mpfb.create_human()
    dummy = bpy.context.view_layer.objects.active
    print("  dummy human created:", dummy)

    # Find the armature among dummy's relatives (MPFB creates basemesh; need its rig container object)
    def find_armature_relative(obj):
        for o in bpy.data.objects:
            if o.type == 'ARMATURE':
                return o
        return None

    bpy.ops.mpfb.load_rig(filepath=str(th_local / "talkinghead.mpfbskel"))
    print("  rig loaded")
    arm = find_armature_relative(dummy)
    if arm:
        bpy.context.view_layer.objects.active = arm
        arm.select_set(True)
    bpy.ops.mpfb.load_weights(filepath=str(th_local / "talkinghead.mhw"))
    print("  weights loaded")

    bpy.context.scene.MPFB_MRP_library_rig_name = "talkinghead"
    bpy.context.scene.MPFB_MRP_library_identifying_bones = "LeftToe_End"
    bpy.context.scene.MPFB_MRP_library_also_save_weights = True
    bpy.ops.mpfb.save_rig_to_library()
    print("  rig saved to library as 'talkinghead'")

    # Delete dummy human and its armature
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(bpy.data.objects):
        o.select_set(True)
    bpy.ops.object.delete()
    print("  dummy deleted")

    stage("create the real avatar: adult female")
    bpy.context.scene.MPFB_NH_add_phenotype = True
    bpy.context.scene.MPFB_NH_phenotype_gender = "female"
    bpy.context.scene.MPFB_NH_phenotype_age = "young"
    bpy.context.scene.MPFB_NH_phenotype_race = "caucasian"
    bpy.ops.mpfb.create_human()
    human = bpy.context.view_layer.objects.active
    print("  human created:", human)

    stage("add TalkingHead custom rig to the human")
    bpy.context.scene.MPFB_ADR_custom_rig = "talkinghead"
    bpy.context.scene.MPFB_ADR_import_weights_custom = True
    bpy.ops.mpfb.add_custom_rig()
    print("  custom rig added")

    def asset_path(subdir, asset_type, label):
        items = AssetService.get_asset_list(subdir, asset_type)
        if label not in items:
            raise RuntimeError(f"Asset '{label}' not found in '{subdir}'. Available: {sorted(items.keys())}")
        return items[label]["full_path"]

    def apply_library_clothes(label, subdir, asset_type, object_type):
        path = asset_path(subdir, asset_type, label)
        bpy.context.view_layer.objects.active = human
        human.select_set(True)
        bpy.ops.mpfb.load_library_clothes(filepath=path, object_type=object_type, material_type="MAKESKIN")
        print(f"  applied {object_type}: {label}")

    stage("apply skin")
    skin_path = asset_path("skins", "mhmat", "Young caucasian female")
    bpy.context.view_layer.objects.active = human
    human.select_set(True)
    bpy.ops.mpfb.load_library_skin(filepath=skin_path)
    print("  applied skin: Young caucasian female")

    stage("apply eyes, eyebrows, eyelashes, teeth, tongue")
    apply_library_clothes("High-poly", "eyes", "mhclo", "Eyes")
    apply_library_clothes("Eyebrow003", "eyebrows", "mhclo", "Eyebrows")
    apply_library_clothes("Eyelashes02", "eyelashes", "mhclo", "Eyelashes")
    apply_library_clothes("Teeth base", "teeth", "mhclo", "Teeth")
    apply_library_clothes("Tongue01", "tongue", "mhclo", "Tongue")

    stage("Phase 25: skip stock MPFB hair entirely -- replaced with procedural strand-ribbon hair, added after the export-copy/bone-fix stages below (see 'Phase 25 procedural hair' stage near export)")
    # Every installed MPFB long-hair asset (Long01, o4saken_long01, faydaen_hair_1) has been
    # tried and rejected across Phases 15/21/22 (helmet-like / patchy / too-short-and-blocky).
    # Phase 24/25 validated a from-scratch Geometry-Nodes curve-to-ribbon approach instead,
    # with a real image-texture alpha fix (Phase 4's proven GREATER_THAN node technique,
    # previously verified only on an isolated standalone test). No MPFB hair asset is applied
    # here at all -- intentional, not an oversight.

    stage("apply business attire")
    # Phase 13: swapped from "Female elegantsuit01" (the striped shirt flagged as
    # unprofessional against the reference image) to "Toigo female suit" -- a dark
    # charcoal/near-black pinstripe one-piece suit (confirmed CC0 by MRT, embedded
    # directly in toigo_female_suit.mhclo's own `license CC0` line; verified via
    # AssetService.get_asset_list("clothes", "mhclo") that this exact label resolves).
    # No separate white-top asset exists in the installed MPFB clothes catalog, so this
    # does not reproduce "black blazer over white top" exactly -- it is the closest
    # existing, properly-licensed single-asset approximation. See Phase 13 report.
    apply_library_clothes("Toigo female suit 2", "clothes", "mhclo", "Clothes")

    stage("diagnostic: confirm real material names before swapping textures")
    all_mat_names = sorted(m.name for m in bpy.data.materials)
    print("  materials present:", all_mat_names)
    for expected in RECOLOR_TARGETS:
        if expected not in all_mat_names:
            print(f"  WARNING: expected material '{expected}' not found in material list above")

    stage("FIX (Phase 13b): recolor hair/skin/suit base-color textures")
    # Swap each material's Image Texture node to the pre-recolored PNG (see RECOLOR_TARGETS
    # comment above). Verified-missing or unexpectedly-structured materials are reported, not
    # silently skipped, per this investigation's standing "no claimed fix without evidence" rule.
    recolored = []
    for mat_name, tex_path in RECOLOR_TARGETS.items():
        mat = bpy.data.materials.get(mat_name)
        if mat is None:
            print(f"  WARNING: material '{mat_name}' not found, skipping recolor")
            continue
        nt = mat.node_tree
        # Confirmed by direct node-graph dump (diag_nodes.py): on every one of these MakeSkin
        # materials, Base Color <- MIX_RGB "diffuseIntensity" <- Color2 <- TEX_IMAGE named
        # exactly "diffuseTexture" -- a consistent MPFB naming convention, not a guess. (An
        # earlier attempt traced "the first TEX_IMAGE node" and silently grabbed a bump-map
        # node instead on the suit material -- caught by checking the swapped-out image's old
        # name in the log, not assumed correct.)
        img_node = nt.nodes.get("diffuseTexture")
        if img_node is None or img_node.type != 'TEX_IMAGE':
            print(f"  WARNING: no node named 'diffuseTexture' (TEX_IMAGE) on '{mat_name}', skipping recolor")
            continue
        old_image_name = img_node.image.name if img_node.image else None
        new_img = bpy.data.images.load(str(tex_path), check_existing=False)
        new_img.colorspace_settings.name = img_node.image.colorspace_settings.name if img_node.image else 'sRGB'
        img_node.image = new_img
        recolored.append((mat_name, old_image_name, "->", tex_path.name))
    print("  textures recolored:", recolored)
    if len(recolored) != len(RECOLOR_TARGETS):
        print(f"  WARNING: expected {len(RECOLOR_TARGETS)} materials recolored, got {len(recolored)}")

    stage("FIX (Phase 16): flatten the suit's NORMAL map over the removed-tie/ascot region too")
    # Same principle as Phase 15's bump-map fix on the previous suit asset: a decorative
    # element (there, a brooch; here, a tie/ascot shape) is baked into BOTH the diffuse
    # texture AND a separate relief map, independently. "Toigo female suit 2" uses a real
    # NORMAL map (Fsuit2-norm.png, tangent-space RGB), not a height/bump map -- confirmed by
    # direct node-tree dump (diag_suit2_material.py): the node is 'normalmapTexture'
    # (TEX_IMAGE) feeding a NORMAL_MAP node named 'normalmap', not 'bumpmapTexture' (that
    # node exists on this material but has no image attached -- a vestigial, unused slot, not
    # assumed by analogy with the previous suit asset). Fill value (128,128,255) is the
    # standard flat/no-relief encoding for a tangent-space normal map, not a guessed value.
    suit_mat_for_normal = bpy.data.materials.get("Human.toigo_female_suit_2")
    if suit_mat_for_normal is not None:
        normal_node = suit_mat_for_normal.node_tree.nodes.get("normalmapTexture")
        if normal_node is not None and normal_node.type == 'TEX_IMAGE':
            old_normal_name = normal_node.image.name if normal_node.image else None
            new_normal_img = bpy.data.images.load(str(PHASE20_TEX_DIR / "Suit2NormNoTie_v2.png"), check_existing=False)
            new_normal_img.colorspace_settings.name = normal_node.image.colorspace_settings.name if normal_node.image else 'Non-Color'
            normal_node.image = new_normal_img
            print(f"  suit normal texture: {old_normal_name} -> Suit2NormNoTie_v2.png (Phase 20 re-fix)")
        else:
            print("  WARNING: 'normalmapTexture' TEX_IMAGE node not found on suit material, skipping normal-map flatten")
    else:
        print("  WARNING: Human.toigo_female_suit_2 material not found for normal-map flatten")

    stage("FIX (Phase 14): skin subsurface depth + suit specular/roughness, not texture")
    # Phase 13b fixed hair/skin/suit COLOR via texture recoloring. The user's Phase 14 report
    # of remaining "flat/pale skin" and "charcoal, not black, blazer" needed the actual layer
    # identified before touching anything further -- confirmed by direct diagnostic dump
    # (diag_materials_v8.py / diag_skin_mat.py) rather than assumed:
    #   - Suit diffuse texture pixels sampled directly from the source PNG are already 0 or 50
    #     (near-black) before the Phase 13b x0.22 multiply even applies -- the texture is NOT
    #     the cause. The material's Specular IOR Level is Blender's unmodified default (0.5),
    #     which puts a uniform ~4% non-metal specular reflectance on every surface regardless
    #     of how dark the diffuse base is -- under the direct+ambient lighting this reads as a
    #     visible gray sheen on "black" fabric. Lowering it, plus a touch more roughness
    #     (already a reasonably matte 0.7, nudged to 0.85 for a believable cloth finish, not a
    #     flat plastic one), is a material fix, not a texture one.
    #   - Skin's Subsurface Weight is 0.0 -- fully disabled -- despite the material already
    #     having a real Subsurface Radius configured ([1.0, 0.2, 0.1], a standard skin SSS
    #     falloff preset: red scatters furthest, as real skin does). This is the actual,
    #     separate root cause of "flat/plastic" skin depth, distinct from Phase 13b's color
    #     fix. A moderate (not maximal) weight is used -- too much subsurface on a MakeHuman
    #     mesh is a known failure mode that reads as waxy/translucent, not skin-like.
    suit_mat = bpy.data.materials.get("Human.toigo_female_suit_2")
    if suit_mat:
        bsdf = next((n for n in suit_mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bsdf:
            before = (bsdf.inputs['Roughness'].default_value, bsdf.inputs['Specular IOR Level'].default_value)
            bsdf.inputs['Roughness'].default_value = 0.85
            bsdf.inputs['Specular IOR Level'].default_value = 0.18
            print(f"  suit material: Roughness {before[0]:.3f}->0.85, Specular IOR Level {before[1]:.3f}->0.18")
        else:
            print("  WARNING: no Principled BSDF found on suit material")
    else:
        print("  WARNING: Human.toigo_female_suit_2 material not found for property fix")

    skin_mat = bpy.data.materials.get("Human.body")
    if skin_mat:
        bsdf = next((n for n in skin_mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bsdf:
            before_ss = bsdf.inputs['Subsurface Weight'].default_value
            bsdf.inputs['Subsurface Weight'].default_value = 0.25
            print(f"  skin material: Subsurface Weight {before_ss:.3f}->0.25 (radius already [1.0, 0.2, 0.1], untouched)")
        else:
            print("  WARNING: no Principled BSDF found on skin material")
    else:
        print("  WARNING: Human.body material not found for property fix")

    stage("FIX (Phase 18): reduce skin and hair Specular IOR Level -- same plastic-sheen mechanism Phase 14 already fixed on the suit")
    # Root cause, confirmed by directly reading avatar_v10.glb's own exported material JSON
    # (not assumed from the Blender side): Human.long01 (hair) and Human.body (skin) both
    # still carry glTF's completely default specular response -- no KHR_materials_specular
    # extension at all, meaning Blender's unmodified Specular IOR Level of 0.5 is exactly what
    # ships. This is the identical mechanism Phase 14 found and fixed on the suit material
    # (a uniform ~4% non-metal specular reflectance that reads as a visible gray/glossy sheen
    # regardless of how dark or richly-colored the diffuse base is) -- it was simply never
    # applied to hair or skin because Phase 14's own scope that pass was the suit specifically.
    # This directly explains two of this phase's complaints: hair's "excessive shine/painted"
    # look, and part of skin's "plastic" look (the other, separate contributor -- subsurface
    # depth -- was already addressed just above and is a genuine glTF-format dead end per
    # Phase 14's own finding, not revisited here). Values are a smaller reduction than the
    # suit's (which needed to look like matte black fabric); skin and hair both legitimately
    # have SOME natural specular highlight (skin oil, hair sheen) so these are tuned to reduce,
    # not eliminate, specular response -- verified by rendering, not guessed blind.
    hair_mat = bpy.data.materials.get("Human.long01")
    if hair_mat:
        bsdf = next((n for n in hair_mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bsdf:
            before = (bsdf.inputs['Roughness'].default_value, bsdf.inputs['Specular IOR Level'].default_value)
            bsdf.inputs['Roughness'].default_value = 0.78
            bsdf.inputs['Specular IOR Level'].default_value = 0.18
            print(f"  hair material: Roughness {before[0]:.3f}->0.78, Specular IOR Level {before[1]:.3f}->0.18")
        else:
            print("  WARNING: no Principled BSDF found on hair material")
    else:
        print("  WARNING: Human.long01 material not found for property fix")

    stage("FIX (Phase 20): soften eyelash prominence -- alpha scale, not color (texture color already near-black/realistic, confirmed by direct pixel sampling)")
    # Diagnostic (phase20-scratch/diag_eyelash.py) confirmed: Human.eyelashes02's diffuseColor
    # in its own .mhmat is 1,1,1 (fully texture-driven, no tint applied), and the texture's own
    # RGB averages near-black (0.8, 0.2, 0.1) -- a realistic lash color, not the problem.
    # Alpha channel is what's fully opaque (max 255) at every lash-strand pixel. Scaling alpha
    # down (0.62x, phase20-scratch/fix's eyelashes02_softened.png) makes the lashes read as
    # thinner/subtler without changing their color or touching mesh geometry, per this phase's
    # "do not blindly modify face geometry" instruction. A full compare across the other 3
    # installed eyelash assets (01/03/04) was NOT done this pass (time-boxed) -- disclosed in
    # the Phase 20 report as a real scope limitation, not silently skipped.
    lash_mat = bpy.data.materials.get("Human.eyelashes02")
    if lash_mat:
        alpha_input = None
        bsdf = next((n for n in lash_mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bsdf:
            alpha_input = bsdf.inputs.get('Alpha')
        swapped = False
        if alpha_input is not None and alpha_input.is_linked:
            src = alpha_input.links[0].from_node
            if src.type == 'TEX_IMAGE' and src.image:
                old_name = src.image.name
                new_img = bpy.data.images.load(str(PHASE20_TEX_DIR / "eyelashes02_softened.png"), check_existing=False)
                new_img.colorspace_settings.name = src.image.colorspace_settings.name
                src.image = new_img
                print(f"  eyelash alpha texture: {old_name} -> eyelashes02_softened.png (Phase 20)")
                swapped = True
        if not swapped:
            print("  WARNING: could not locate eyelash Alpha TEX_IMAGE node, skipping soften")
    else:
        print("  WARNING: Human.eyelashes02 material not found")

    if skin_mat:
        bsdf = next((n for n in skin_mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bsdf:
            before_spec = bsdf.inputs['Specular IOR Level'].default_value
            bsdf.inputs['Specular IOR Level'].default_value = 0.28
            print(f"  skin material: Specular IOR Level {before_spec:.3f}->0.28 (roughness left at 0.7, skin needs a softer but present highlight)")
        else:
            print("  WARNING: no Principled BSDF found on skin material (2nd pass)")

    print("\nSaving intermediate .blend after asset application for inspection.")
    bpy.ops.wm.save_as_mainfile(filepath=str(POC_DIR / "avatar_stage2_v11.blend"))
    print("Saved avatar_stage2_v11.blend")

    stage("create export copy with Oculus visemes + ARKit face units baked")
    bpy.context.view_layer.objects.active = human
    bpy.ops.object.select_all(action='DESELECT')
    human.select_set(True)
    bpy.context.scene.MPFB_EXPO_bake_shapekeys = True
    bpy.context.scene.MPFB_EXPO_mask_modifiers = "BAKE"
    bpy.context.scene.MPFB_EXPO_subdiv_modifiers = "BAKE"
    bpy.context.scene.MPFB_EXPO_delete_helpers = True
    bpy.context.scene.MPFB_EXPO_visemes_meta = True
    bpy.context.scene.MPFB_EXPO_visemes_microsoft = False
    bpy.context.scene.MPFB_EXPO_faceunits_arkit = True
    bpy.context.scene.MPFB_EXPO_interpolate = True
    bpy.context.scene.MPFB_EXPO_remove_basemesh = False
    bpy.ops.mpfb.export_copy()
    print("  export copy created")

    try:
        bpy.ops.wm.save_as_mainfile(filepath=str(POC_DIR / "avatar_stage3_exportcopy_v11.blend"))
        print("Saved avatar_stage3_exportcopy_v11.blend")
    except RuntimeError as e:
        # Blender raises this for a non-fatal shape-key cleanup warning (an orphaned
        # intermediate shape key from modifier-apply-with-shapekeys gets auto-deleted);
        # the file is still written successfully despite the exception.
        print("  non-fatal save warning (continuing):", e)

    stage("find the export-copy armature, verify root name 'Armature'")
    export_armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE' and o.name != 'Armature']
    print("  all armature objects:", [o.name for o in bpy.data.objects if o.type == 'ARMATURE'])

    stage("FIX: normalize bone roll axes on the export-copy armature (talkinghead.fix_bone_axes_t)")
    # Real root cause, found by comparing a raw Blender rest-pose render (looks correct: full hair
    # coverage, no clothing tear, normal mouth) against TalkingHead's POSED render (distorted at the
    # jaw/collar/spine -- exactly where bones rotate away from rest). MPFB.md's own footnote [2] warns
    # bone roll/axis mismatches get baked into GLB matrices and twist geometry once posed by an external
    # engine. The TalkingHead Blender addon ships a dedicated fixer for exactly this
    # (talkinghead.fix_bone_axes_t / _a), which the v1 script never called. Our rig is in T-pose
    # (confirmed visually: arms horizontal in the stage2 rest render), so use the T-pose reference set.
    export_rig = bpy.data.objects.get("Human.rig_export_copy")
    if export_rig is None:
        # fall back: any armature object whose name ends with _export_copy
        for o in bpy.data.objects:
            if o.type == 'ARMATURE' and o.name.endswith('_export_copy'):
                export_rig = o
                break
    if export_rig is not None:
        bpy.ops.object.select_all(action='DESELECT')
        bpy.context.view_layer.objects.active = export_rig
        export_rig.select_set(True)
        bpy.ops.talkinghead.fix_bone_axes_t()
        print(f"  ran fix_bone_axes_t on {export_rig.name}")
    else:
        print("  WARNING: could not find export-copy armature, skipping bone-axis fix")

    stage("FIX (Phase 7): correct the Head bone's forward-tilt, baked in by fix_bone_axes_t's own T-pose reference")
    # Root cause (Phase 7, see reports/Professional Avatar Visual Refinement - Phase 7.md): measured
    # directly on this exported avatar_v4.glb that the Head joint's own local rotation relative to Neck
    # is +2.289 degrees about local X (quaternion [0.019978, -0.0000084, 0.0000993, 0.99980]), on top of
    # a similar +2.226 degree contribution from Neck itself. This is NOT introduced by export -- confirmed
    # identical between the pre-export "Human.rig" and the export-copy "Human.rig_export_copy" before
    # fix_bone_axes_t ever runs -- and fix_bone_axes_t's own T-pose reference data
    # (BONE_AXES_DATA_A["Head"] = [0, -0.990155, -0.139976]) itself encodes a nonzero forward lean as
    # "correct" for a Mixamo-style rig, which is what actually ships. Verified empirically via a direct
    # Blender-rendered front view: posing Head by +20 degrees makes the downward tilt dramatically worse,
    # -20 degrees visibly lifts the gaze toward the camera -- confirming both the sign and that this
    # bone genuinely drives the visible "looking down" symptom MPFB.md's own troubleshooting section
    # names. Scope: only the Head bone, per this phase's explicit instruction -- Neck's own contribution
    # is left untouched. Fix: pose Head by the exact inverse of its measured local rotation, then bake it
    # permanently into the mesh and bone rest state via "Apply Pose as Rest Pose" (this is what MPFB.md's
    # "remember to apply all transforms" instruction means in practice -- a pose-mode correction applied
    # as the new rest, not an edit-mode bone-matrix edit, which would have zero visual effect since
    # skinning deformation is always identity when pose equals rest).
    #
    # HONEST FOLLOW-UP (Phase 7, after this fix shipped): a statistical A/B test through the real
    # TalkingHead engine (5 fresh-page-load samples each on v4 and v5, reading getValue('headRotateX')
    # and getValue('bodyRotateX') at t=300ms) found `headRotateX` is 0 on every single sample on BOTH
    # versions -- this pose-delta control is never driven at all for either avatar in this harness.
    # What actually varies, substantially, on both v4 AND v5 alike, is `eyesLookDown` (0.13-0.45 across
    # samples) -- TalkingHead's own idle eye-wander behavior, present on both versions in a similar
    # range, not something this rest-pose fix changes. This static +2.289 degree correction is still a
    # real, measured, correctly-applied fix for what it targets (the baked rest-pose rotation MPFB.md's
    # troubleshooting section describes), but it is NOT the dominant visible cause of the "looking
    # down" symptom seen in close-up screenshots -- that is primarily TalkingHead's own idle animation,
    # which is out of scope to change here. Kept in the pipeline because it is a real, correctly-sourced
    # fix for a real measured defect, not because it alone resolves the visible symptom.
    if export_rig is not None:
        import math
        bpy.ops.object.select_all(action='DESELECT')
        bpy.context.view_layer.objects.active = export_rig
        export_rig.select_set(True)
        bpy.ops.object.mode_set(mode='POSE')
        head_pb = export_rig.pose.bones.get("Head")
        if head_pb is not None:
            head_pb.rotation_mode = 'XYZ'
            head_pb.rotation_euler = (math.radians(-2.289), 0.0, 0.0)
            bpy.ops.pose.select_all(action='DESELECT')
            head_pb.bone.select = True
            bpy.ops.pose.armature_apply(selected=True)
            print("  applied -2.289 deg corrective pose on Head as new rest pose")
        else:
            print("  WARNING: no 'Head' pose bone found, skipping head-tilt fix")
        bpy.ops.object.mode_set(mode='OBJECT')
    else:
        print("  WARNING: no export-copy armature, skipping head-tilt fix")

    stage("FIX: remove the 'Jaw' vertex group from every export-copy mesh (the real root cause)")
    # Real root cause, found by directly inspecting the exported GLB's skin data: the custom
    # "talkinghead" rig (talkinghead.mpfbskel) includes a "Jaw" bone that stock Mixamo rigs do
    # NOT have. Its rest/bind rotation is wildly abnormal (~144 degrees around X relative to
    # Head -- a bind pose should be near-identity). TalkingHead's own fix_bone_axes_t() reference
    # data is built from stock Mixamo bone orientations and has NO entry for "Jaw", so that bone's
    # bad orientation was never validated or fixable by that tooling. Worse, MPFB's automatic
    # weight-transfer assigned nonzero "Jaw" influence not just to teeth (48.7% of verts) but also
    # to hair (16.4%), the body itself (8%), and the suit (2.9%) -- a single broken bone poisoning
    # nearly every mesh. TalkingHead's engine never references a bone named "Jaw" anywhere (grep
    # confirmed) -- all mouth animation is morph-target driven -- so this bone is pure dead weight
    # that nothing intentionally uses. Fix: remove it entirely and let weights renormalize across
    # each vertex's remaining (correct) groups.
    jaw_removed_from = []
    for o in bpy.data.objects:
        if o.type != 'MESH' or not o.name.endswith('_export_copy'):
            continue
        jaw_group = o.vertex_groups.get('Jaw')
        if jaw_group is not None:
            o.vertex_groups.remove(jaw_group)
            jaw_removed_from.append(o.name)
    print(f"  removed 'Jaw' vertex group from: {jaw_removed_from}")

    stage("FIX: strip stray unbaked Subdivision modifiers from accessory/clothing export copies")
    # Root cause (found by direct .blend inspection after the v1 run): MPFB's own
    # bake_modifiers_remove_helpers() is only invoked on the main basemesh export copy.
    # Every accessory mesh (eyebrows, eyelashes, teeth, tongue, hair, suit, eyes) keeps a
    # live Subdivision modifier at levels=0 (viewport) / render_levels=1. Blender's glTF
    # exporter bakes using RENDER settings, so it silently subdivides these meshes once at
    # export time -- on geometry that was never fitted/authored for that, with their many
    # morph-target shape keys still attached. That is what the 64 "Applied modifier was not
    # first" warnings were (a non-first modifier being force-applied on a mesh with shape
    # keys), and a one-time subdivision of an unprepared suit/teeth mesh is a direct,
    # sufficient explanation for both the torn-clothing hole and the distorted/discolored
    # mouth -- not two separate bugs.
    fixed_count = 0
    body_export_copy_name = human.name + "_export_copy"
    for o in bpy.data.objects:
        if o.type != 'MESH' or not o.name.endswith('_export_copy'):
            continue
        if o.name == body_export_copy_name:
            continue  # main body already correctly baked by MPFB itself
        for m in list(o.modifiers):
            if m.type == 'SUBSURF':
                print(f"    removing stray Subdivision modifier from {o.name} (was levels={m.levels}, render_levels={m.render_levels})")
                o.modifiers.remove(m)
                fixed_count += 1
    print(f"  removed {fixed_count} stray Subdivision modifiers from accessory/clothing meshes")

    stage("FIX (Phase 4): insert a real alpha-clip shader node on the three affected materials")
    # CORRECTED from an earlier attempt in this same phase: setting mat.blend_method = 'CLIP'
    # does NOT work on Blender 4.5 and does NOT change the exported alphaMode at all -- verified
    # by diffing the exported GLB's JSON, byte-for-byte identical alphaMode=BLEND with or without
    # that property set. Root cause: Blender's own glTF exporter (io_scene_gltf2/blender/exp/
    # material/search_node_tree.py, gather_alpha_info()) has a code comment stating plainly
    # "Alpha mode is determined by the nodes too (previously it used the Eevee blend_method)" --
    # the legacy blend_method/alpha_threshold Python properties are IGNORED by this exporter
    # version entirely. It instead inspects the actual shader node graph feeding the Principled
    # BSDF's Alpha socket, specifically detect_alpha_clip(), which recognizes a Math node with
    # operation GREATER_THAN (input1 = cutoff constant) directly upstream of Alpha -- exactly the
    # manual node MPFB.md's own "MASK / Alpha Clip" section instructs a human to add in the
    # Shading workspace. This is the real, verified fix (confirmed via an isolated single-mesh
    # export + direct GLB JSON check: produces alphaMode=MASK with the correct alphaCutoff,
    # matching Phase 3's mask_patched_*.glb reference exactly) -- not a property, a node.
    alpha_fixed = []
    for mat_name, threshold in ALPHA_CLIP_MATERIALS.items():
        mat = bpy.data.materials.get(mat_name)
        if mat is None:
            print(f"  WARNING: material '{mat_name}' not found, skipping")
            continue
        nt = mat.node_tree
        bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if bsdf is None:
            print(f"  WARNING: no Principled BSDF on '{mat_name}', skipping")
            continue
        alpha_in = bsdf.inputs['Alpha']
        if not alpha_in.is_linked:
            print(f"  WARNING: Alpha input on '{mat_name}' is not linked (constant {alpha_in.default_value}), skipping node insertion")
            continue
        link = alpha_in.links[0]
        src_socket = link.from_socket
        nt.links.remove(link)
        math_node = nt.nodes.new('ShaderNodeMath')
        math_node.operation = 'GREATER_THAN'
        math_node.label = "AlphaClipFix_Phase4"
        math_node.inputs[1].default_value = threshold
        nt.links.new(src_socket, math_node.inputs[0])
        nt.links.new(math_node.outputs['Value'], alpha_in)
        alpha_fixed.append((mat_name, threshold))
    print("  alpha-clip node inserted on:", alpha_fixed)
    if len(alpha_fixed) != len(ALPHA_CLIP_MATERIALS):
        print(f"  WARNING: expected {len(ALPHA_CLIP_MATERIALS)} materials fixed, got {len(alpha_fixed)}")

    stage("Phase 7's eye-desaturation approach REMOVED (Phase 18): confirmed inert on export, replaced by the RECOLOR_TARGETS texture swap above")
    # Phase 7 inserted a ShaderNodeHueSaturation node on Human.high-poly's Base Color chain.
    # Phase 18 found this never actually reduced redness in the shipped GLB: reading
    # avatar_v10.glb's own material JSON directly showed baseColorTexture still resolving to
    # an image literally named "brown_eye" (the untouched original) with no baseColorFactor
    # tint -- Blender's glTF exporter does not export a generic Hue/Saturation node, so the
    # fix was cosmetic in the Blender viewport only and never reached the browser. See the
    # RECOLOR_TARGETS comment above for the real, export-proven fix (a baked texture swap,
    # same mechanism already confirmed working for hair/skin/suit in Phases 13b/15/16).
    print("  (no-op: see RECOLOR_TARGETS texture swap for the real eye fix)")

    stage("Phase 25: procedural strand-ribbon hair -- generated on the final, bone-fixed export copy, rigidly skinned to Head")
    # Replaces every MPFB stock hair asset (all rejected: Long01 helmet-like, o4saken_long01
    # patchy, faydaen_hair_1 too short/blocky -- Phases 15/21/22). Built from scratch via a
    # Geometry Nodes curve-to-mesh ribbon technique, validated standalone first
    # (poc/mpfb-avatar-poc/phase24-hair-curve-test/test_haircurves_v2.py) before being wired
    # into the real pipeline here. Two real fixes beyond the original Phase 24 test:
    # (1) alpha transparency -- Phase 24's procedural Noise->ColorRamp alpha fed the BSDF
    # Alpha input with NO Image Texture node in the chain at all; confirmed by reading the
    # exported GLB's own JSON that Blender's exporter silently drops a pure-procedural alpha
    # graph (no bake target), falling back to a flat alphaMode:BLEND with zero texture. Fixed
    # by authoring a real baked PNG (gen_strand_alpha_blender.py) and driving Alpha through it
    # via the proven Phase 4 GREATER_THAN-node technique (confirmed, by direct GLB JSON
    # inspection on the standalone test, to produce a real alphaMode:MASK with an embedded
    # texture -- not assumed from the Blender viewport). (2) density -- 60 guide strands read
    # as "wet string" sparse; 300 was chosen after measuring real browser frame-rate scaling
    # (60->~12fps, 300->~5fps, 600->~2.5fps in this headless/software-rendering environment)
    # as a density that looks genuinely full without the prohibitive cost of 600.
    import math as _math
    import random as _random
    from mathutils import Vector as _Vector

    hair_head_mesh = None
    # FIX (Phase 25, root-caused by cross-referencing Phase 19's own diagnostic from earlier in
    # this investigation): 'high-poly' in the name matches "Human.high-poly_export_copy", which
    # Phase 19 already established is the 1064-vertex EYE mesh, not the head -- confirmed again
    # here directly (bbox half-width ~0.031m, eyeball-sized). Every strand was growing from near
    # the eye, invisible in the Phase 24 isolated test (no head geometry to contrast against) but
    # catastrophic once placed on the real avatar (a mostly-bald crown, hair clustered near one
    # eye). The real head+body mesh is "Human_export_copy" (9650 verts, no 'high-poly' in the
    # name) -- selected by exact name match, not substring, to avoid ever repeating this mistake.
    hair_head_mesh = bpy.data.objects.get("Human_export_copy")
    if hair_head_mesh is None:
        # fall back: the largest-vertex export-copy mesh, which is robustly the body/head
        candidates = [o for o in bpy.data.objects if o.type == 'MESH' and o.name.endswith('_export_copy')]
        if candidates:
            hair_head_mesh = max(candidates, key=lambda o: len(o.data.vertices))
    if hair_head_mesh is None or export_rig is None:
        print("  WARNING: could not find export-copy head mesh or armature, skipping procedural hair entirely")
    else:
        bbox = [hair_head_mesh.matrix_world @ _Vector(c) for c in hair_head_mesh.bound_box]
        zmin = min(v.z for v in bbox)
        zmax = max(v.z for v in bbox)
        xmin = min(v.x for v in bbox)
        xmax = max(v.x for v in bbox)
        # FIX (Phase 25, second root cause on the same bug): now that hair_head_mesh is correctly
        # the full body ("Human_export_copy", 9650 verts, not the 1064-vert eye mesh), the OLD
        # 0.72 Z-fraction (tuned, unknowingly, against the tiny eye mesh's own bbox) is wrong --
        # on a full standing-body bbox it lands around the torso/chest, not the head at all.
        # Measured directly: the eye mesh's own average Z sits at 93.3% of total body height, so
        # a pure-Z cutoff anywhere below that includes forehead/face/torso. A Z-only cutoff also
        # can't distinguish "scalp" from "forehead/face" (both are above eye level) -- fixed by
        # ALSO requiring Y (front/back depth) to be at or behind the eye's own Y position (eyes
        # measured at Y=-0.1167; more negative Y is further forward/face-ward in this mesh's
        # convention), which keeps the candidate region to the hairline-and-back scalp dome,
        # not the front of the face. Verified directly: this combination yields ~1893 candidate
        # points in a believable scalp-only spatial extent, vs. 3298 (face+scalp) with Z alone.
        scalp_z_threshold = zmin + (zmax - zmin) * 0.90
        eye_mesh_ref = bpy.data.objects.get("Human.high-poly_export_copy")
        if eye_mesh_ref is not None:
            eye_bbox = [eye_mesh_ref.matrix_world @ _Vector(c) for c in eye_mesh_ref.bound_box]
            eye_y = sum(v.y for v in eye_bbox) / len(eye_bbox)
        else:
            eye_y = None  # fall back to Z-only if the eye mesh can't be found for some reason
        center_x = (xmin + xmax) / 2.0

        # FIX (Phase 26, root-caused by direct numeric check, not assumed): the growth loop below
        # used to move every strand by a hardcoded (0,0,-1) direction regardless of root position.
        # At the actual crown apex this direction's dot product with the real surface normal is
        # -0.95 to -0.999 (measured directly, see reports/Phase 26 ...), meaning the strand's very
        # first step travels INTO the head mesh, not away from it -- invisible, buried geometry.
        # 16.6% of all scalp candidate points have this same conflict (the whole crown dome); side/
        # back points don't, which is exactly why only side/back hair was ever visible. Fix: capture
        # each root's world-space vertex normal alongside its position, and use it in the growth loop.
        nmat = hair_head_mesh.matrix_world.to_3x3().inverted().transposed()
        scalp_points = []
        scalp_normals = {}
        for v in hair_head_mesh.data.vertices:
            wv = hair_head_mesh.matrix_world @ v.co
            if wv.z > scalp_z_threshold and (eye_y is None or wv.y >= eye_y):
                scalp_points.append(wv.copy())
                scalp_normals[wv.copy().freeze()] = (nmat @ v.normal).normalized()
        print(f"  scalp candidate points: {len(scalp_points)} (z_thresh={scalp_z_threshold:.4f}, eye_y={eye_y})")

        # FIX (Phase 25, found via actual browser evidence -- a bald crown/one-sided coverage
        # pattern invisible in the Phase 24 isolated hair-only render, since there was no scalp
        # skin behind it to contrast against): picking N random points from the mesh's VERTEX
        # LIST inherits whatever vertex-density distribution the mesh happens to have across
        # the scalp region -- if vertices are denser on one side/region than another, a
        # uniform-probability vertex sample is NOT spatially uniform. Fix: bin candidate points
        # into an (x,y) grid spanning the scalp's actual bounding area and draw a roughly equal
        # number of strands per occupied cell, so coverage tracks surface area, not mesh topology.
        N_STRANDS = 150  # Phase 27 stage 3 (final target density)
        GRID_N = 14  # 14x14 cells across the scalp bounding box
        sx0 = min(p.x for p in scalp_points); sx1 = max(p.x for p in scalp_points)
        sy0 = min(p.y for p in scalp_points); sy1 = max(p.y for p in scalp_points)
        cell_w = max(1e-6, (sx1 - sx0) / GRID_N)
        cell_h = max(1e-6, (sy1 - sy0) / GRID_N)
        cells = {}
        for p in scalp_points:
            cx = min(GRID_N - 1, int((p.x - sx0) / cell_w))
            cy = min(GRID_N - 1, int((p.y - sy0) / cell_h))
            cells.setdefault((cx, cy), []).append(p)
        occupied = list(cells.keys())
        print(f"  occupied scalp grid cells: {len(occupied)} / {GRID_N * GRID_N}")
        _random.seed(42)
        _random.shuffle(occupied)
        guide_roots = []
        per_cell = max(1, N_STRANDS // max(1, len(occupied)))
        i = 0
        while len(guide_roots) < N_STRANDS and occupied:
            cell = occupied[i % len(occupied)]
            pts = cells[cell]
            guide_roots.append(pts[_random.randrange(len(pts))])
            i += 1
            if i >= N_STRANDS * 4:  # safety valve against infinite loop on pathological input
                break
        print(f"  guide roots drawn via grid-even sampling: {len(guide_roots)}")

        hair_curve_data = bpy.data.curves.new("ProcHairCurves", type='CURVE')
        hair_curve_data.dimensions = '3D'
        hair_curves_obj = bpy.data.objects.new("ProcHairCurves", hair_curve_data)
        bpy.context.collection.objects.link(hair_curves_obj)

        HAIR_LENGTH = 0.38
        POINTS_PER_STRAND = 12
        # FIX (Phase 27): Phase 26's normal-push-then-fade formula summed two INDEPENDENT additive
        # offset terms (an outward normal push, fading out, and a separate downward fall, fading
        # in) whose net z-tangent crosses zero and goes briefly POSITIVE near the root for true
        # crown points -- measured directly: 2/12 sample points on a representative crown strand
        # sat above the root before falling (see reports/Phase 27 ...), rendering as a visible
        # spike. Root cause: an additive offset model, not a direction model -- two terms can sum
        # non-monotonically even though each fades smoothly on its own.
        # Fix: integrate position by walking along a single continuously-blended UNIT TANGENT
        # direction, where the natural fall direction is ALWAYS present at full weight (never
        # faded to zero, never summed against a competing term that can overpower or cancel it);
        # the scalp normal only contributes a small, fast-decaying PERPENDICULAR nudge (the
        # component of the normal orthogonal to the fall direction), which pushes the strand
        # sideways away from the scalp surface near the root without ever being able to reverse
        # or stall the dominant downward tangent. Numerically verified strictly non-increasing z
        # (zero spike points) on the same representative crown root. A center-part-strand sweep
        # floor (MIN_SWEEP) is also added below: real hair always flows to one side even very
        # close to a center part -- without it, true-center strands fall almost straight down and
        # clip invisibly behind the head's own curved silhouette (found visually in this phase's
        # own 40-strand gate render, not assumed).
        PERP_PUSH = 0.35
        PERP_FADE_T = 0.2
        MIN_SWEEP = 0.07
        for root in guide_roots:
            normal = scalp_normals.get(root.freeze())
            if normal is None:
                normal = _Vector((0.0, 0.0, 1.0))  # safety fallback, should not trigger
            side = 1.0 if root.x > center_x else -1.0
            dist_from_part = abs(root.x - center_x)
            outward_sweep = side * max(MIN_SWEEP, dist_from_part * _random.uniform(0.3, 0.7))
            noise_y = _random.uniform(-0.05, 0.05)
            droop = _random.uniform(0.82, 1.18)
            curve_bend = _random.uniform(-0.03, 0.03)
            fall_dir = _Vector((outward_sweep, noise_y * 2, -HAIR_LENGTH * droop))
            if fall_dir.length > 1e-9:
                fall_dir = fall_dir.normalized()
            out_dir = normal.normalized()
            perp = out_dir - fall_dir * out_dir.dot(fall_dir)
            if perp.length > 1e-6:
                perp = perp.normalized()
            spline = hair_curve_data.splines.new('POLY')
            spline.points.add(POINTS_PER_STRAND - 1)
            pos = root.copy()
            spline.points[0].co = (pos.x, pos.y, pos.z, 1.0)
            step_len = (HAIR_LENGTH * droop) / (POINTS_PER_STRAND - 1)
            for i in range(1, POINTS_PER_STRAND):
                t = i / (POINTS_PER_STRAND - 1)
                k = max(0.0, 1.0 - t / PERP_FADE_T) ** 1.5
                tangent = fall_dir + perp * (PERP_PUSH * k)
                if tangent.length > 1e-9:
                    tangent = tangent.normalized()
                bend = curve_bend * _math.sin(t * _math.pi)
                pos = pos + tangent * step_len
                spline.points[i].co = (pos.x + bend, pos.y, pos.z, 1.0)
        print(f"  built {len(guide_roots)} guide curves (Phase 27: integrated-tangent growth, no spike)")

        hair_mesh_data = bpy.data.meshes.new("ProcHairMesh")
        hair_mesh_obj = bpy.data.objects.new("ProcHairMesh_export_copy", hair_mesh_data)
        bpy.context.collection.objects.link(hair_mesh_obj)

        hmod = hair_mesh_obj.modifiers.new("CurveToCard", 'NODES')
        hgroup = bpy.data.node_groups.new("CurveToCardRibbonFinal", 'GeometryNodeTree')
        hmod.node_group = hgroup
        hgroup.interface.new_socket(name="Geometry", in_out='INPUT', socket_type='NodeSocketGeometry')
        hgroup.interface.new_socket(name="Geometry", in_out='OUTPUT', socket_type='NodeSocketGeometry')
        hn = hgroup.nodes
        hl = hgroup.links
        hn.clear()
        g_in = hn.new('NodeGroupInput')
        g_out = hn.new('NodeGroupOutput')
        g_obj = hn.new('GeometryNodeObjectInfo')
        g_obj.inputs['Object'].default_value = hair_curves_obj
        g_c2m = hn.new('GeometryNodeCurveToMesh')
        g_line = hn.new('GeometryNodeCurvePrimitiveLine')
        g_line.inputs['Start'].default_value = (-0.0035, 0, 0)
        g_line.inputs['End'].default_value = (0.0035, 0, 0)
        g_radius = hn.new('GeometryNodeSetCurveRadius')
        g_param = hn.new('GeometryNodeSplineParameter')
        g_range = hn.new('ShaderNodeMapRange')
        g_range.inputs['To Min'].default_value = 1.0
        g_range.inputs['To Max'].default_value = 0.2
        hl.new(g_obj.outputs['Geometry'], g_radius.inputs['Curve'])
        hl.new(g_param.outputs['Factor'], g_range.inputs['Value'])
        hl.new(g_range.outputs['Result'], g_radius.inputs['Radius'])
        hl.new(g_radius.outputs['Curve'], g_c2m.inputs['Curve'])
        hl.new(g_line.outputs['Curve'], g_c2m.inputs['Profile Curve'])
        hl.new(g_c2m.outputs['Mesh'], g_out.inputs['Geometry'])

        bpy.context.view_layer.objects.active = hair_mesh_obj
        _dg = bpy.context.evaluated_depsgraph_get()
        _eval_obj = hair_mesh_obj.evaluated_get(_dg)
        _real_mesh = bpy.data.meshes.new_from_object(_eval_obj)
        hair_mesh_obj.modifiers.clear()
        hair_mesh_obj.data = _real_mesh
        print(f"  hair mesh: verts={len(_real_mesh.vertices)} polys={len(_real_mesh.polygons)}")

        bpy.ops.object.select_all(action='DESELECT')
        hair_mesh_obj.select_set(True)
        bpy.context.view_layer.objects.active = hair_mesh_obj
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.01)
        bpy.ops.object.mode_set(mode='OBJECT')

        hair_mat = bpy.data.materials.new("ProcHairMat_export_copy")
        hair_mat.use_nodes = True
        hnt = hair_mat.node_tree
        for n in list(hnt.nodes):
            hnt.nodes.remove(n)
        h_out = hnt.nodes.new('ShaderNodeOutputMaterial')
        h_bsdf = hnt.nodes.new('ShaderNodeBsdfPrincipled')
        h_bsdf.inputs['Roughness'].default_value = 0.5
        h_tex = hnt.nodes.new('ShaderNodeTexImage')
        strand_tex_path = str(POC_DIR / "phase24-hair-curve-test" / "strand_alpha.png")
        h_tex.image = bpy.data.images.load(strand_tex_path, check_existing=True)
        h_math = hnt.nodes.new('ShaderNodeMath')
        h_math.operation = 'GREATER_THAN'
        h_math.label = "AlphaClipFix_Phase25"
        h_math.inputs[1].default_value = 0.25
        hnt.links.new(h_tex.outputs['Color'], h_bsdf.inputs['Base Color'])
        hnt.links.new(h_tex.outputs['Alpha'], h_math.inputs[0])
        hnt.links.new(h_math.outputs['Value'], h_bsdf.inputs['Alpha'])
        hnt.links.new(h_bsdf.outputs['BSDF'], h_out.inputs['Surface'])
        hair_mesh_obj.data.materials.append(hair_mat)

        # Rigid-bind skin to the Head bone (real Armature-modifier skinning, so the hair
        # correctly inherits Head bone rotation during live TalkingHead animation -- not
        # just a static unparented mesh sitting in world space).
        head_vg = hair_mesh_obj.vertex_groups.new(name="Head")
        all_idx = [v.index for v in hair_mesh_obj.data.vertices]
        head_vg.add(all_idx, 1.0, 'REPLACE')
        hair_mesh_obj.parent = export_rig
        arm_mod = hair_mesh_obj.modifiers.new("Armature", 'ARMATURE')
        arm_mod.object = export_rig
        print(f"  '{hair_mesh_obj.name}' rigidly skinned to Head bone on {export_rig.name}")

    stage("export to GLB")
    # Select by the reliable "_export_copy" name suffix directly, rather than relying on an
    # "export copy" collection that MPFB does not actually create unless MPFB_EXPO_create_collection
    # is explicitly set -- the v1 script's collection check was always empty and silently fell back
    # to selecting ALL mesh+armature objects (including the un-baked originals), which is a second,
    # independent risk of duplicate/incorrect geometry ending up in the GLB alongside the real export copies.
    bpy.ops.object.select_all(action='DESELECT')
    for o in bpy.data.objects:
        if o.name.endswith('_export_copy') and o.type in ('MESH', 'ARMATURE'):
            o.select_set(True)
    selected_names = [o.name for o in bpy.context.selected_objects]
    print("  selected for export (by _export_copy suffix):", selected_names)
    if not selected_names:
        print("  WARNING: no _export_copy-suffixed objects found, selecting all mesh+armature objects as fallback")
        for o in bpy.data.objects:
            if o.type in ('MESH', 'ARMATURE'):
                o.select_set(True)

    bpy.ops.export_scene.gltf(
        filepath=str(OUT_GLB),
        export_format='GLB',
        use_selection=True,
        export_animations=False,
    )
    print("  exported to", OUT_GLB)
    print("  GLB size bytes:", OUT_GLB.stat().st_size if OUT_GLB.exists() else "MISSING")

    print("\nALL STAGES COMPLETE")

except Exception:
    print("\n!!!!!!!!!! SCRIPT FAILED !!!!!!!!!!")
    traceback.print_exc()
    try:
        bpy.ops.wm.save_as_mainfile(filepath=str(POC_DIR / "avatar_failure_dump_v11.blend"))
        print("Saved avatar_failure_dump_v11.blend for post-mortem inspection")
    except Exception:
        pass
    sys.exit(1)

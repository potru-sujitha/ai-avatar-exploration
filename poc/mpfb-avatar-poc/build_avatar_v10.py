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
OUT_GLB = POC_DIR / "avatar_v10.glb"
TEX_DIR = POC_DIR / "phase13b-textures"
PHASE15_TEX_DIR = POC_DIR / "phase15-textures"
PHASE16_TEX_DIR = POC_DIR / "phase16-textures"

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
RECOLOR_TARGETS = {
    "Human.body": TEX_DIR / "WarmNeutralSkin.png",
    "Human.toigo_female_suit_2": PHASE16_TEX_DIR / "Suit2Black.png",
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

    stage("apply hair (Phase 15: long hair, catalog label confirmed via diag_hair_labels.py diagnostic run -- 'Long01', not guessed)")
    apply_library_clothes("Long01", "hair", "mhclo", "Hair")

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
            new_normal_img = bpy.data.images.load(str(PHASE16_TEX_DIR / "Suit2NormNoTie.png"), check_existing=False)
            new_normal_img.colorspace_settings.name = normal_node.image.colorspace_settings.name if normal_node.image else 'Non-Color'
            normal_node.image = new_normal_img
            print(f"  suit normal texture: {old_normal_name} -> Suit2NormNoTie.png")
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

    print("\nSaving intermediate .blend after asset application for inspection.")
    bpy.ops.wm.save_as_mainfile(filepath=str(POC_DIR / "avatar_stage2_v10.blend"))
    print("Saved avatar_stage2_v10.blend")

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
        bpy.ops.wm.save_as_mainfile(filepath=str(POC_DIR / "avatar_stage3_exportcopy_v10.blend"))
        print("Saved avatar_stage3_exportcopy_v10.blend")
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

    stage("FIX (Phase 7): reduce visible vein/redness intensity on the eye (sclera) material")
    # Root cause (Phase 7, see reports/Professional Avatar Visual Refinement - Phase 7.md): the
    # source eye texture (brown_eye.png, MPFB's own "High-poly" eyes asset) is a normal, realistic
    # eye texture when viewed in full -- not a defective or unusually bloodshot asset. But direct
    # getValue() sampling through the real TalkingHead engine (5 fresh-load trials each on v4 and
    # v5) shows `eyesLookDown` legitimately reaching 0.13-0.45 as part of TalkingHead's own idle
    # eye-wander behavior (confirmed present and in a similar range on BOTH the unfixed and
    # head-tilt-fixed avatar -- this is a TalkingHead engine behavior, not something this avatar's
    # rig causes, and out of scope to change). That idle behavior periodically closes the eyelid
    # down over the upper portion of the sclera -- precisely the region where this texture's vein
    # detail is most concentrated (confirmed by visually inspecting the extracted source texture).
    # The combination (normal TalkingHead idle behavior + this texture's particular vein placement)
    # is what reads as "bloodshot" at close range, not a shader bug. Since the idle behavior itself
    # is out of scope to change, the available fix is to reduce the texture's own vein-red
    # intensity so it reads as natural even when more of the upper sclera is exposed. Verified in
    # isolation first (phase7/test_eye_desaturate.py, phase7/eye_compare_capture.cjs): a moderate
    # Hue/Saturation node (Saturation 0.55, Value/Hue unchanged) visibly reduces vein redness while
    # keeping a natural-looking iris and sclera, not a flat/grey/lifeless eye.
    eye_mat = bpy.data.materials.get("Human.high-poly")
    if eye_mat is not None:
        nt = eye_mat.node_tree
        bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        base_color_in = bsdf.inputs['Base Color'] if bsdf else None
        if base_color_in is not None and base_color_in.is_linked:
            link = base_color_in.links[0]
            src_socket = link.from_socket
            nt.links.remove(link)
            hsv = nt.nodes.new('ShaderNodeHueSaturation')
            hsv.label = "EyeRednessReduce_Phase7"
            hsv.inputs['Saturation'].default_value = 0.55
            nt.links.new(src_socket, hsv.inputs['Color'])
            nt.links.new(hsv.outputs['Color'], base_color_in)
            print("  inserted eye desaturation node (Saturation=0.55) on Human.high-poly")
        else:
            print("  WARNING: eye material's Base Color input not linked as expected, skipping")
    else:
        print("  WARNING: 'Human.high-poly' material not found, skipping eye desaturation fix")

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
        bpy.ops.wm.save_as_mainfile(filepath=str(POC_DIR / "avatar_failure_dump_v10.blend"))
        print("Saved avatar_failure_dump_v10.blend for post-mortem inspection")
    except Exception:
        pass
    sys.exit(1)

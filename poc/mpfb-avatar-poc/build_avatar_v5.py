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
OUT_GLB = POC_DIR / "avatar_v5.glb"

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
ALPHA_CLIP_MATERIALS = {
    "Human.female_elegantsuit01": 0.5,
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

    stage("apply hair (professional bob)")
    apply_library_clothes("Toigo blunt bob", "hair", "mhclo", "Hair")

    stage("apply business attire")
    apply_library_clothes("Female elegantsuit01", "clothes", "mhclo", "Clothes")

    print("\nSaving intermediate .blend after asset application for inspection.")
    bpy.ops.wm.save_as_mainfile(filepath=str(POC_DIR / "avatar_stage2_v5.blend"))
    print("Saved avatar_stage2_v5.blend")

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
        bpy.ops.wm.save_as_mainfile(filepath=str(POC_DIR / "avatar_stage3_exportcopy_v5.blend"))
        print("Saved avatar_stage3_exportcopy_v5.blend")
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
        bpy.ops.wm.save_as_mainfile(filepath=str(POC_DIR / "avatar_failure_dump_v5.blend"))
        print("Saved avatar_failure_dump_v5.blend for post-mortem inspection")
    except Exception:
        pass
    sys.exit(1)

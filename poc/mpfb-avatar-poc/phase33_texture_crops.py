import bpy

# Crop the region u=[0,0.1], v=[0,0.1] (bottom-left margin, where black-padding
# examples clustered) at higher visual scale for comparison, from each texture
# stage: original (v12), fixed20 (v17), blend50 (v18 flawed), masked_blend (v18 v2 fix).
paths = {
    "a_original_v12": r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase20-textures\long01_diffuse_recolored.png",
    "b_fixed20_v17": r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase30-textures\long01_fixed20.png",
    "c_blend50_v18flawed": r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase31-textures\long01_blend50.png",
    "d_masked_blend_v18fix": r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase33-textures\long01_masked_blend.png",
}

for name, p in paths.items():
    img = bpy.data.images.load(p)
    w, h = img.size
    # Crop bottom-left 20% x 20% region (the margin area), scale up 4x for visibility
    crop_w, crop_h = int(w*0.2), int(h*0.2)
    pixels = img.pixels[:]
    out_w, out_h = crop_w, crop_h
    out = bpy.data.images.new(name + "_crop", width=out_w, height=out_h, alpha=True)
    out_pixels = [0.0] * (out_w * out_h * 4)
    for y in range(out_h):
        for x in range(out_w):
            src_idx = (y * w + x) * 4
            dst_idx = (y * out_w + x) * 4
            out_pixels[dst_idx:dst_idx+4] = pixels[src_idx:src_idx+4]
    out.pixels = out_pixels
    out_path = rf"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase33-textures\crop_{name}.png"
    out.filepath_raw = out_path
    out.file_format = 'PNG'
    out.save()
    print("wrote", out_path)

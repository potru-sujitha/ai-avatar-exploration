import bpy
img = bpy.data.images.load(r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase18_reference_crop.png")
w, h = img.size
px = list(img.pixels)
crop_x0, crop_x1 = 250, 600
crop_y0_top, crop_y1_top = 150, 400
cw = crop_x1 - crop_x0
ch = crop_y1_top - crop_y0_top
out = bpy.data.images.new("crop", cw, ch, alpha=True)
outpx = [0.0]*(cw*ch*4)
for yy_top in range(crop_y0_top, crop_y1_top):
    yb = h - 1 - yy_top
    for xx in range(crop_x0, crop_x1):
        src_idx = (yb*w+xx)*4
        dst_y = ch - 1 - (yy_top - crop_y0_top)
        dst_idx = (dst_y*cw + (xx-crop_x0))*4
        outpx[dst_idx:dst_idx+4] = px[src_idx:src_idx+4]
out.pixels = outpx
out.filepath_raw = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase39_ref_face_crop.png"
out.file_format = 'PNG'
out.save()
print("saved ref crop", cw, ch)

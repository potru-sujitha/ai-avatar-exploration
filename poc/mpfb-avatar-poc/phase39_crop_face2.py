import bpy
img = bpy.data.images.load(r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase39_v19_front.png")
w, h = img.size
px = list(img.pixels)
# crop region top-down y:250-450, x:250-500 (guess face/cheek area) -> convert to blender bottom-up
crop_x0, crop_x1 = 250, 500
crop_y0_top, crop_y1_top = 250, 450
cw = crop_x1 - crop_x0
ch = crop_y1_top - crop_y0_top
out = bpy.data.images.new("crop", cw, ch, alpha=True)
outpx = [0.0]*(cw*ch*4)
for yy_top in range(crop_y0_top, crop_y1_top):
    yb = h - 1 - yy_top
    for xx in range(crop_x0, crop_x1):
        src_idx = (yb*w+xx)*4
        dst_y = ch - 1 - (yy_top - crop_y0_top)  # keep same visual orientation when saved
        dst_idx = (dst_y*cw + (xx-crop_x0))*4
        outpx[dst_idx:dst_idx+4] = px[src_idx:src_idx+4]
out.pixels = outpx
out.filepath_raw = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase39_face_crop.png"
out.file_format = 'PNG'
out.save()
print("saved crop", cw, ch)

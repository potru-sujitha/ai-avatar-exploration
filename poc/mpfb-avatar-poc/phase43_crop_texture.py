import bpy

img = bpy.data.images.load(r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase43_diffuse_full.png")
W, H = img.size
print("size:", W, H)

# blender image pixel coords: y=0 at bottom. crop a generous region around + above the
# originally-measured tie rect (x[1600,1930] y[1800,2048]) to also capture the knot.
bx0, bx1 = 1450, 2048
by0, by1 = 1500, 2048
cw, ch = bx1 - bx0, by1 - by0

pixels = list(img.pixels)  # flat RGBA, row-major, y=0 at bottom

crop_img = bpy.data.images.new("crop", width=cw, height=ch, alpha=True)
crop_pixels = [0.0] * (cw * ch * 4)
for row in range(ch):
    src_y = by0 + row
    for col in range(cw):
        src_x = bx0 + col
        src_idx = (src_y * W + src_x) * 4
        dst_idx = (row * cw + col) * 4
        crop_pixels[dst_idx:dst_idx+4] = pixels[src_idx:src_idx+4]
crop_img.pixels = crop_pixels
crop_img.filepath_raw = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase43_diffuse_crop.png"
crop_img.file_format = 'PNG'
crop_img.save()
print("saved crop", cw, ch)

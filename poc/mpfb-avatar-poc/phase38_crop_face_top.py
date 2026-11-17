import bpy, array

src = bpy.data.images.load(r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase13b-textures\WarmNeutralSkin.png")
w, h = src.size
pix = array.array('f', src.pixels[:])

# crop box in pixel space (x0,y0)-(x1,y1), note Blender image origin is bottom-left
x0, y0, x1, y1 = 1250, 1150, 2048, 1670  # upper portion of the face island (flipped Y)
cw, ch = x1 - x0, y1 - y0
out = bpy.data.images.new("crop", cw, ch)
out_pix = array.array('f', [0.0]) * (cw * ch * 4)
for yy in range(ch):
    src_y = y0 + yy
    for xx in range(cw):
        src_x = x0 + xx
        si = (src_y * w + src_x) * 4
        di = (yy * cw + xx) * 4
        out_pix[di:di+4] = pix[si:si+4]
out.pixels[:] = out_pix
out.filepath_raw = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase38_face_top_crop.png"
out.file_format = 'PNG'
out.save()
print("saved crop", cw, ch)

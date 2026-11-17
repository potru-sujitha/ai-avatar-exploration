import bpy, array, os

SRC = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase13b-textures\WarmNeutralSkin.png"
OUT_DIR = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase38-textures"
os.makedirs(OUT_DIR, exist_ok=True)

img = bpy.data.images.load(SRC)
w, h = img.size
pix = array.array('f', img.pixels[:])
out_pix = array.array('f', pix)  # start as a copy

def luminance(r, g, b):
    return 0.3*r + 0.59*g + 0.11*b

X0, Y0, X1, Y1 = 1200, 1050, 2048, 2048
VAR_THRESH = 0.00045  # between p75-80: catches real stubble, leaves smooth skin alone
BLUR_RADIUS = 9        # wide box-blur radius in px, applied only to masked pixels

def idx(x, y):
    return (y * w + x) * 4

# Pass 1: local variance mask (5x5 window, stride matches detection earlier)
mask = bytearray(w * h)
masked_count = 0
for y in range(Y0+2, Y1-2):
    for x in range(X0+2, X1-2):
        lums = []
        for dy in (-2, 0, 2):
            for dx in (-2, 0, 2):
                i = idx(x+dx, y+dy)
                lums.append(luminance(pix[i], pix[i+1], pix[i+2]))
        mean = sum(lums) / len(lums)
        var = sum((l-mean)**2 for l in lums) / len(lums)
        if var > VAR_THRESH:
            mask[y*w+x] = 1
            masked_count += 1
print("masked (stubble) pixel count:", masked_count)

# Pass 2: for masked pixels, replace with a wide box-blur average of the ORIGINAL
# image (not iteratively-corrupted), computed over a BLUR_RADIUS window -- this
# washes out the high-frequency stubble speckle while preserving the local mean
# skin tone (which varies gently across the face), rather than a single flat paint color.
fixed_count = 0
for y in range(Y0, Y1):
    for x in range(X0, X1):
        if not mask[y*w+x]:
            continue
        rs = gs = bs = 0.0
        n = 0
        for dy in range(-BLUR_RADIUS, BLUR_RADIUS+1, 3):
            yy = y + dy
            if yy < 0 or yy >= h:
                continue
            for dx in range(-BLUR_RADIUS, BLUR_RADIUS+1, 3):
                xx = x + dx
                if xx < 0 or xx >= w:
                    continue
                i = idx(xx, yy)
                rs += pix[i]; gs += pix[i+1]; bs += pix[i+2]
                n += 1
        if n == 0:
            continue
        i = idx(x, y)
        out_pix[i] = rs / n
        out_pix[i+1] = gs / n
        out_pix[i+2] = bs / n
        # leave alpha unchanged
        fixed_count += 1

print("fixed pixel count:", fixed_count)

out = bpy.data.images.new("WarmNeutralSkin_scalpfix", w, h)
out.pixels[:] = out_pix
out.filepath_raw = os.path.join(OUT_DIR, "WarmNeutralSkin_scalpfix.png")
out.file_format = 'PNG'
out.save()
print("saved", out.filepath_raw)

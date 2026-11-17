import bpy, math

def srgb_to_linear(c):
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4

def rgb_to_lab(r, g, b):
    r, g, b = srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b)
    X = r*0.4124 + g*0.3576 + b*0.1805
    Y = r*0.2126 + g*0.7152 + b*0.0722
    Z = r*0.0193 + g*0.1192 + b*0.9505
    Xn, Yn, Zn = 0.9505, 1.0, 1.089
    def f(t):
        return t**(1/3) if t > 0.008856 else (7.787*t + 16/116)
    fx, fy, fz = f(X/Xn), f(Y/Yn), f(Z/Zn)
    L = 116*fy - 16
    a = 500*(fx - fy)
    bb = 200*(fy - fz)
    return L, a, bb

def sample_patch(path, cx, cy, half=10):
    img = bpy.data.images.load(path)
    w, h = img.size
    px = list(img.pixels)
    rs, gs, bs = [], [], []
    for yy in range(cy-half, cy+half):
        for xx in range(cx-half, cx+half):
            # bpy pixels are bottom-up
            idx = (yy*w + xx) * 4
            if 0 <= idx < len(px)-3:
                rs.append(px[idx]); gs.append(px[idx+1]); bs.append(px[idx+2])
    r, g, b = sum(rs)/len(rs), sum(gs)/len(gs), sum(bs)/len(bs)
    bpy.data.images.remove(img)
    return r, g, b

# reference crop: sample a clean cheek patch. Image likely modest size; guess center-ish cheek area.
ref_path = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase18_reference_crop.png"
refimg_tmp = bpy.data.images.load(ref_path)
rw, rh = refimg_tmp.size
bpy.data.images.remove(refimg_tmp)
print("reference crop size:", rw, rh)

def topdown_to_blender_y(y_top, height):
    return height - y_top

ref_path = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase18_reference_crop.png"
avatar_path = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase39_v19_front.png"

# reference crop is 980x760; cheek sample at top-down (530,255), verified visually clean skin
rr, rg, rb = sample_patch(ref_path, 530, topdown_to_blender_y(255, 760), half=12)
print("reference cheek RGB:", rr, rg, rb)
rL, ra, rbb = rgb_to_lab(rr, rg, rb)
print("reference cheek Lab:", rL, ra, rbb)

# avatar front screenshot is 750x650; cheek sample at top-down (430,405), verified visually clean skin
ar, ag, ab = sample_patch(avatar_path, 430, topdown_to_blender_y(405, 650), half=12)
print("avatar cheek RGB:", ar, ag, ab)
aL, aa, abb = rgb_to_lab(ar, ag, ab)
print("avatar cheek Lab:", aL, aa, abb)

dE = math.sqrt((rL-aL)**2 + (ra-aa)**2 + (rbb-abb)**2)
print("Delta-E (cheek):", dE)

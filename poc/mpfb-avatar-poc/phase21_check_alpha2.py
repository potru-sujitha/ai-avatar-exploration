import bpy

def analyze(path, label):
    try:
        img = bpy.data.images.load(path, check_existing=True)
    except Exception as e:
        print(f"{label}: FAILED to load ({e})")
        return
    w, h = img.size
    if w == 0:
        print(f"{label}: zero size, skip")
        return
    px = list(img.pixels)
    n = w * h
    opaque = 0
    transparent = 0
    for i in range(n):
        a = px[i * 4 + 3]
        if a > 0.8:
            opaque += 1
        elif a < 0.2:
            transparent += 1
    mid = n - opaque - transparent
    print(f"{label}: {path}  size={w}x{h}")
    print(f"  opaque(>0.8)={100*opaque/n:.1f}%  transparent(<0.2)={100*transparent/n:.1f}%  mid-alpha={100*mid/n:.1f}%")
    bpy.data.images.remove(img)

base = r"C:\Users\Admin\AppData\Roaming\Blender Foundation\Blender\4.5\extensions\.user\user_default\mpfb\data\hair"
analyze(base + r"\culturalibre_hair_01\diffuse_black.png", "culturalibre_hair_01")
analyze(base + r"\culturalibre_hair_05\hair_05.png", "culturalibre_hair_05")
analyze(base + r"\faydaen_hair_1\hair.png", "faydaen_hair_1")

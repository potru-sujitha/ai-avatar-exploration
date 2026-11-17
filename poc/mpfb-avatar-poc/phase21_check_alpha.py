import bpy

def analyze(path, label):
    img = bpy.data.images.load(path, check_existing=True)
    w, h = img.size
    px = list(img.pixels)  # RGBA flat
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

analyze(r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase20-textures\long01_diffuse_recolored.png", "Long01 (current)")
analyze(r"C:\Users\Admin\AppData\Roaming\Blender Foundation\Blender\4.5\extensions\.user\user_default\mpfb\data\hair\o4saken_long01\o4saken_long01.png", "o4saken_long01")

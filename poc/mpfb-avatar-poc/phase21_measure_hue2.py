import bpy, colorsys

def measure(path, label):
    img = bpy.data.images.load(path, check_existing=True)
    w, h = img.size
    px = list(img.pixels)
    n = w * h
    hues, lights = [], []
    step = 7
    for i in range(0, n, step):
        r, g, b, a = px[i*4], px[i*4+1], px[i*4+2], px[i*4+3]
        if a < 0.8:
            continue
        hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
        if ll < 0.03 or ll > 0.97:
            continue
        hues.append(hh * 360)
        lights.append(ll)
    avg_hue = sum(hues) / len(hues) if hues else -1
    avg_light = sum(lights) / len(lights) if lights else -1
    print(f"{label}: samples={len(hues)}  avg_hue={avg_hue:.1f}deg  avg_lightness={avg_light:.3f}")
    bpy.data.images.remove(img)

base = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc"
measure(base + r"\phase20-textures\long01_diffuse_recolored.png", "Long01 Phase20 (reference target)")
measure(base + r"\phase21-textures\o4saken_long01_lightened_2.8x.png", "o4saken 2.8x")
measure(base + r"\phase21-textures\o4saken_long01_lightened_3.6x.png", "o4saken 3.6x")

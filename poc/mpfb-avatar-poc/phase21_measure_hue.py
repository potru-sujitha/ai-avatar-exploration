import bpy, colorsys

def measure(path, label):
    img = bpy.data.images.load(path, check_existing=True)
    w, h = img.size
    px = list(img.pixels)
    n = w * h
    hues = []
    lights = []
    step = 7  # sample every 7th opaque pixel for speed
    for i in range(0, n, step):
        r, g, b, a = px[i*4], px[i*4+1], px[i*4+2], px[i*4+3]
        if a < 0.8:
            continue
        hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
        if ll < 0.03 or ll > 0.97:
            continue  # skip near-black/white outliers
        hues.append(hh * 360)
        lights.append(ll)
    avg_hue = sum(hues) / len(hues) if hues else -1
    avg_light = sum(lights) / len(lights) if lights else -1
    print(f"{label}: samples={len(hues)}  avg_hue={avg_hue:.1f}deg  avg_lightness={avg_light:.3f}")
    bpy.data.images.remove(img)

measure(r"C:\Users\Admin\AppData\Roaming\Blender Foundation\Blender\4.5\extensions\.user\user_default\mpfb\data\hair\o4saken_long01\o4saken_long01.png", "o4saken_long01 (stock)")

import bpy

paths = {
    "v12_recolored": r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase20-textures\long01_diffuse_recolored.png",
    "v17_fixed20": r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase30-textures\long01_fixed20.png",
    "v18_blend50": r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase31-textures\long01_blend50.png",
}

imgs = {}
for name, p in paths.items():
    img = bpy.data.images.load(p)
    imgs[name] = img
    print(name, img.size)

w, h = imgs["v12_recolored"].size
import array
pix = {name: array.array('f', img.pixels[:]) for name, img in imgs.items()}

def sample(name, u, v):
    x = int(u * w)
    y = int(v * h)
    idx = (y * w + x) * 4
    return tuple(round(c, 3) for c in pix[name][idx:idx+4])

print("\n=== Sampling near top-of-card 'root' band, varying V (0=bottom,1=top) at u=0.15 (left big card) ===")
for v in [0.99, 0.97, 0.95, 0.93, 0.90, 0.85, 0.80]:
    row = {name: sample(name, 0.15, v) for name in pix}
    print(f"v={v}: v12={row['v12_recolored']}  v17={row['v17_fixed20']}  v18={row['v18_blend50']}")

print("\n=== Same scan at u=0.35 (near panel seam / center area) ===")
for v in [0.99, 0.97, 0.95, 0.93, 0.90]:
    row = {name: sample(name, 0.35, v) for name in pix}
    print(f"v={v}: v12={row['v12_recolored']}  v17={row['v17_fixed20']}  v18={row['v18_blend50']}")

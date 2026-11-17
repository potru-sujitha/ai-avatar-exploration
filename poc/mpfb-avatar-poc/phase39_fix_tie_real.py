import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v18_candidate_v3.glb")
img = bpy.data.images.get("Suit2Black_v2")
pix = list(img.pixels)
w, h = img.size

# Sample the jacket's own black color nearby to match exactly (not an arbitrary black).
def sample(x,y):
    i=(y*w+x)*4
    return pix[i],pix[i+1],pix[i+2],pix[i+3]
jacket_rgb = sample(1700, 100)  # clearly jacket-body region, far from any white patch
print("jacket color sample:", jacket_rgb)

def set_region(x0,x1,y0,y1,r,g,b):
    cnt=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            i=(y*w+x)*4
            pix[i]=r; pix[i+1]=g; pix[i+2]=b
            cnt+=1
    return cnt

# Confirmed tie UV region (the large vertical white rect), plus a small safety margin.
n = set_region(1590,1940,1790,2048, jacket_rgb[0], jacket_rgb[1], jacket_rgb[2])
print("recolored", n, "tie-region px to jacket black")

img.pixels[:] = pix
img.filepath_raw = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase39-textures\Suit2Black_notie_real.png"
img.file_format='PNG'
img.save()

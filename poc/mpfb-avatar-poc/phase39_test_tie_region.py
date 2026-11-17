import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\avatar_v18_candidate_v3.glb")
img = bpy.data.images.get("Suit2Black_v2")
pix = list(img.pixels)
w, h = img.size
# The large vertical white rectangle is roughly x in [1600,1930], y in [1800,2048] in Blender's
# bottom-up pixel coords (displayed image was top-down, so this is the TOP-right region visually
# -> in Blender's pixel array, y=0 is bottom, so top-of-image y~1930-2048 maps to high y index).
def set_region(x0,x1,y0,y1,r,g,b):
    cnt=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            i = (y*w+x)*4
            pix[i]=r; pix[i+1]=g; pix[i+2]=b
            cnt+=1
    return cnt
# paint it bright magenta as a debug marker (easy to spot in render)
n = set_region(1600,1930,1800,2048,1.0,0.0,1.0)
print("painted", n, "px magenta (candidate: large vertical white rect)")
img.pixels[:] = pix
img.filepath_raw = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase39-textures\Suit2Black_debug_region1.png"
img.file_format='PNG'
img.save()

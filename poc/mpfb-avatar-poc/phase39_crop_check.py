import bpy
img = bpy.data.images.load(r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase39_v19_front.png")
w,h = img.size
print("avatar front size:", w, h)
bpy.data.images.remove(img)

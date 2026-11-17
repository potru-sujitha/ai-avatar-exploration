import bpy, array

BASE = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase20-textures\long01_diffuse_recolored.png"   # v12 / pre-erosion original
FIXED20 = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase30-textures\long01_fixed20.png"           # v17 / crown-fixed, starting point
OUT = r"C:\Users\sujitha\talking-avatar\poc\mpfb-avatar-poc\phase33-textures\long01_masked_blend.png"

img_base = bpy.data.images.load(BASE)
img_fixed = bpy.data.images.load(FIXED20)
w, h = img_base.size
assert img_fixed.size[0] == w and img_fixed.size[1] == h

pix_base = array.array('f', img_base.pixels[:])
pix_fixed = array.array('f', img_fixed.pixels[:])
n = w * h

# --- Step 1: identify the affected region exactly (full resolution, alpha changed base->fixed) ---
ALPHA_CHANGE_THRESH = 0.02
affected = bytearray(n)  # 1 = affected pixel
affected_count = 0
for i in range(n):
    idx = i * 4
    a_b = pix_base[idx+3]
    a_f = pix_fixed[idx+3]
    if abs(a_b - a_f) > ALPHA_CHANGE_THRESH:
        affected[i] = 1
        affected_count += 1

print("Full-res affected pixel count (alpha changed base->fixed20):", affected_count)
print("Equivalent stride-2 estimate would be ~", affected_count // 4, "(Phase 32 reported 57,151 at stride 2)")

# --- Step 2: histogram luminance of RGB for affected pixels only ---
import collections
hist = collections.Counter()
lum_values = []
for i in range(n):
    if not affected[i]:
        continue
    idx = i * 4
    r, g, b = pix_fixed[idx], pix_fixed[idx+1], pix_fixed[idx+2]
    lum = 0.3*r + 0.59*g + 0.11*b
    lum_values.append(lum)
    bucket = round(lum, 2)
    hist[bucket] += 1

lum_values.sort()
print("\nLuminance histogram of affected-pixel RGB (bucketed to 0.02):")
for k in sorted(hist.keys()):
    if hist[k] > 20:  # only show buckets with meaningful mass
        print(f"  lum={k:.2f}: {hist[k]} pixels")

print("\nLuminance percentiles of affected pixels:")
for p in [1, 5, 10, 15, 20, 25, 30, 40, 50]:
    idx_p = int(len(lum_values) * p / 100)
    print(f"  p{p}: {lum_values[idx_p]:.4f}")

# --- Step 3: choose threshold from the gap, apply masked restoration ---
# Histogram (first pass) showed a bimodal split: a continuous low-luminance
# mass from 0.00-0.43 (113,428 pixels at exactly lum=0.00 alone -- pure black
# padding, plus a smooth anti-aliased-edge tail up to ~0.43), then a GENUINE
# empty gap with zero pixels from ~0.45 to ~0.74, then the real hair-colored
# cluster at 0.74-1.00 (the big spike at 0.83 and 1.00 = actual hair
# highlights/midtones). 0.08 (the original guess) was wrong -- it would have
# treated most of the edge-blend tail as "hair color". The threshold must sit
# in the empty gap.
LUM_THRESHOLD = 0.55   # near-black/edge-blend padding vs genuine hair color cutoff, set inside the confirmed empty gap (0.45-0.74)
RESTORE_RATIO = 0.5    # same ratio Phase 31 used, now gated by the mask

out_pix = array.array('f', pix_fixed)  # start as a copy of fixed20 (the required starting point)
restored_count = 0
excluded_black_count = 0
for i in range(n):
    if not affected[i]:
        continue
    idx = i * 4
    r, g, b = pix_fixed[idx], pix_fixed[idx+1], pix_fixed[idx+2]
    lum = 0.3*r + 0.59*g + 0.11*b
    a_b = pix_base[idx+3]
    a_f = pix_fixed[idx+3]
    if lum < LUM_THRESHOLD:
        # near-black padding: leave fixed20's suppressed alpha untouched
        excluded_black_count += 1
        continue
    # genuine hair-colored pixel: restore partway back toward original alpha
    new_a = a_f + RESTORE_RATIO * (a_b - a_f)
    out_pix[idx+3] = new_a
    restored_count += 1

print(f"\nOf {affected_count} affected pixels: {restored_count} restored (hair-colored), {excluded_black_count} excluded (near-black padding, alpha left suppressed)")

# --- Step 4: verify every non-affected pixel is untouched (byte-identical to fixed20) ---
diff_outside_mask = 0
for i in range(n):
    if affected[i]:
        continue
    idx = i * 4
    for c in range(4):
        if out_pix[idx+c] != pix_fixed[idx+c]:
            diff_outside_mask += 1
print("Pixels outside the affected mask that differ from fixed20 (must be 0):", diff_outside_mask)

# --- Write output ---
img_out = bpy.data.images.new("masked_blend", width=w, height=h, alpha=True)
img_out.pixels = out_pix
img_out.filepath_raw = OUT
img_out.file_format = 'PNG'
img_out.save()
print("\nWrote", OUT)

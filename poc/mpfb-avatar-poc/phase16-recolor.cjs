const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return [h, s, l];
}

async function recolorSuit2(inPath, outPath) {
  const img = sharp(inPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let fabric = 0, floral = 0, kept = 0;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const [h, s, l] = rgbToHsl(r, g, b);
    if (s > 0.15 && h >= 260 && h <= 345) {
      // magenta/pink fabric -> true neutral black, NOT a proportional RGB scale (which
      // preserves the magenta hue ratio and reads as dark purple/eggplant, not black --
      // caught by looking at the actual render, not assumed from the formula). Desaturate
      // to gray using original luminance for the fold-shading variation, then darken.
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const gray = Math.round(lum * 0.28); // keep fold/highlight variation, push dark
      data[i] = gray; data[i + 1] = gray; data[i + 2] = gray;
      fabric++;
    } else if (s > 0.25 && !(h >= 260 && h <= 345)) {
      // the floral print (greens/other saturated hues) -> plain off-white inner top
      data[i] = 238; data[i + 1] = 235; data[i + 2] = 227;
      floral++;
    } else {
      kept++; // already white/gray: collar, buttons, trim
    }
  }
  // Direct bounding-box override for the floral-print atlas pieces (the small collar
  // accent, the main "bottle"-shaped piece, and the small oval) -- the hue-based pass above
  // correctly converted the colorful petal pixels, but left the pattern's dark near-black
  // outline/detail strokes untouched (they have near-zero saturation, so they never matched
  // the floral hue test). A real render showed this clearly: a white background with the
  // dark flower outlines still visible as a speckled pattern on what should be a plain tie/
  // collar accent. Fixed by forcing this exact region to solid off-white regardless of the
  // original pixel color, confirmed via a direct crop of the source texture
  // (floral_zoom.png), not guessed.
  const bx0 = Math.round(1700 / 2048 * width), bx1 = Math.round(1970 / 2048 * width);
  const by0 = Math.round(30 / 2048 * height), by1 = Math.round(1040 / 2048 * height);
  let overridden = 0;
  for (let y = by0; y < by1; y++) {
    for (let x = bx0; x < bx1; x++) {
      const i = (y * width + x) * channels;
      data[i] = 238; data[i + 1] = 235; data[i + 2] = 227;
      overridden++;
    }
  }
  console.log("  floral-region bounding-box override applied, pixels:", overridden);
  await sharp(data, { raw: { width, height, channels } }).png().toFile(outPath);
  console.log("suit2 diffuse recolored ->", outPath, "fabric:", fabric, "floral->white:", floral, "kept:", kept);
}

// Flatten the tie/ascot silhouette in the normal map to neutral (128,128,255) so it stops
// reading as a raised, folded cravat shape -- same principle as Phase 15's bump-map fix for
// the previous suit's brooch (diffuse color alone wasn't enough there either).
async function flattenTieNormal(inPath, outPath) {
  const img = sharp(inPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  // Bounding box around the tie/ascot shape, read directly off the inspected texture
  // (2048x2048 source): roughly x 1150-1600, y 390-840.
  const x0 = Math.round(1150 / 2048 * width), x1 = Math.round(1600 / 2048 * width);
  const y0 = Math.round(390 / 2048 * height), y1 = Math.round(840 / 2048 * height);
  let flattened = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * channels;
      data[i] = 128; data[i + 1] = 128; data[i + 2] = 255;
      flattened++;
    }
  }
  await sharp(data, { raw: { width, height, channels } }).png().toFile(outPath);
  console.log("suit2 normal map tie region flattened ->", outPath, "pixels:", flattened);
}

async function recolorSkinMore(inPath, outPath, lMul, aAdd, bAdd, label) {
  function rgbToLab(r, g, b) {
    const f = (c) => { c /= 255; return c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92; };
    const [R, G, B] = [f(r), f(g), f(b)];
    const X = R * 0.4124 + G * 0.3576 + B * 0.1805;
    const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
    const Z = R * 0.0193 + G * 0.1192 + B * 0.9505;
    const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
    const g2 = (t) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
    const fx = g2(X / Xn), fy = g2(Y / Yn), fz = g2(Z / Zn);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  function labToRgb(L, A, B) {
    const fy = (L + 16) / 116, fx = fy + A / 500, fz = fy - B / 200;
    const g2 = (t) => { const t3 = t * t * t; return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787; };
    const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
    const X = g2(fx) * Xn, Y = g2(fy) * Yn, Z = g2(fz) * Zn;
    const R = X * 3.2406 + Y * -1.5372 + Z * -0.4986;
    const G = X * -0.9689 + Y * 1.8758 + Z * 0.0415;
    const Bc = X * 0.0557 + Y * -0.2040 + Z * 1.0570;
    const f = (c) => { c = c > 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c; return Math.max(0, Math.min(255, Math.round(c * 255))); };
    return [f(R), f(G), f(Bc)];
  }
  const img = sharp(inPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const [L, A, B] = rgbToLab(r, g, b);
    const newL = L * lMul, newA = A + aAdd, newB = B + bAdd;
    const [nr, ng, nb] = labToRgb(newL, newA, newB);
    data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;
  }
  await sharp(data, { raw: { width, height, channels } }).png().toFile(outPath);
  console.log(`skin recolor [${label}] ->`, outPath);
}

(async () => {
  const OUT = path.join(__dirname, "phase16-textures");
  fs.mkdirSync(OUT, { recursive: true });
  const SUIT_DIR = "C:/Users/Admin/AppData/Roaming/Blender Foundation/Blender/4.5/extensions/.user/user_default/mpfb/data/clothes/toigo_female_suit_2";
  await recolorSuit2(path.join(SUIT_DIR, "Fsuit2.png"), path.join(OUT, "Suit2Black.png"));
  await flattenTieNormal(path.join(SUIT_DIR, "Fsuit2-norm.png"), path.join(OUT, "Suit2NormNoTie.png"));

  // Skin: current Phase13 WarmNeutralSkin.png is L*0.9, A+2.5, B+2.0 applied to the ORIGINAL
  // young_lightskinned_female_diffuse.png. Test two stronger candidates directly from the
  // original (not double-applying on top of the already-shifted one, to avoid compounding
  // rounding drift), for a real side-by-side comparison.
  const ORIG_SKIN = "C:/Users/Admin/AppData/Roaming/Blender Foundation/Blender/4.5/extensions/.user/user_default/mpfb/data/skins/young_caucasian_female/young_lightskinned_female_diffuse.png";
  await recolorSkinMore(ORIG_SKIN, path.join(OUT, "SkinWarmB.png"), 0.88, 4.0, 3.5, "B: moderate push");
  await recolorSkinMore(ORIG_SKIN, path.join(OUT, "SkinWarmC.png"), 0.85, 5.5, 5.0, "C: stronger push");
  console.log("ALL DONE");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

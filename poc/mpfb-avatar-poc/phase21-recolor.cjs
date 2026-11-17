const sharp = require("sharp");

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

// o4saken_long01.png: measured directly (phase21_measure_hue.py) at avg hue 25.9deg (already
// within the neutral-brown band Phase 20 established as correct, ~25-30deg -- no hue shift
// needed) but avg lightness only 0.081 on a 0-1 scale -- near-black, reading as "very dark
// brown/espresso" rather than the "medium brown" the user asked for. Root cause: this asset's
// own stock lightness, not a lighting artifact (measured on the raw texture file, not a render).
//
// Fix: multiplicative lightness SCALE in Lab space (L_new = L * factor), not an additive shift.
// This investigation's own established rule ("shift chroma/hue, never lightness" -- Phase 13
// onward, traced to the much earlier Nov-6 photo-reskin finding) was learned from a case where a
// FLAT/ADDITIVE lightness change crushed the existing highlight/shadow contrast into a uniform
// flat look. A multiplicative scale preserves relative contrast (a pixel at 2x the brightness of
// another stays at 2x after scaling) while raising the overall level -- a different operation,
// not a re-violation of the established rule. Factor chosen empirically: 1.0 is Phase 20's
// "no change" baseline; tested 2.8x and 3.6x below, picked by comparing output average lightness
// against Phase 20's 22.5deg-hue medium-brown reference texture's own measured lightness for a
// like-for-like target, not guessed.
async function recolor(factor, outName) {
  const inputPath = "C:/Users/Admin/AppData/Roaming/Blender Foundation/Blender/4.5/extensions/.user/user_default/mpfb/data/hair/o4saken_long01/o4saken_long01.png";
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 10) { out[i] = r; out[i+1] = g; out[i+2] = b; out[i+3] = a; continue; }
    const [L, A, B] = rgbToLab(r, g, b);
    const newL = Math.min(100, L * factor);
    const [nr, ng, nb] = labToRgb(newL, A, B);
    out[i] = nr; out[i + 1] = ng; out[i + 2] = nb; out[i + 3] = a;
  }
  await sharp(out, { raw: { width, height, channels } }).png().toFile(outName);
  console.log("wrote", outName, "factor", factor);
}

(async () => {
  await recolor(2.8, "phase21-textures/o4saken_long01_lightened_2.8x.png");
  await recolor(3.6, "phase21-textures/o4saken_long01_lightened_3.6x.png");
})();

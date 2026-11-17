const sharp = require("sharp");
const path = require("path");

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

// brown_eye.png: light gray-white sclera with visible red vein streaks, dark reddish-brown iris with
// gold flecks, black pupil, plus an unrelated small blue calibration swatch (bottom-right, untouched
// by these luminance/chroma-gated rules since it's a distinct hue).
// Two independent regions handled differently, gated by lightness + existing chroma, not a fixed box:
//  - Sclera/vein region (light, L>55): any red-leaning chroma (A>1.5) is a vein -- pull it toward
//    neutral, most of the sclera (A near 0 already) is untouched.
//  - Iris region (mid-dark, 8<L<55, real chroma present, i.e. not black pupil/outline): rotate hue
//    away from pure red toward a warmer brown angle and moderately reduce chroma, preserving L so the
//    iris's own radial fiber detail and gold flecks stay visible -- same preserve-lightness principle
//    used for hair/skin in Phase 13b, not a flat recolor.
async function recolorEye(inPath, outPath) {
  const img = sharp(inPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let veinPx = 0, irisPx = 0;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const [L, A, B] = rgbToLab(r, g, b);
    const chroma = Math.sqrt(A * A + B * B);
    const hueDeg = (Math.atan2(B, A) * 180) / Math.PI;
    // Skip the blue calibration swatch: B channel strongly negative (blue-leaning), distinct from
    // both sclera (near-neutral) and iris (red/brown, B positive-ish).
    if (B < -10) continue;
    if (L > 55) {
      if (A > 1.5) {
        const newA = A * 0.35; // pull vein redness down sharply, sclera's own near-0 pixels barely move
        const newB = B * 0.9;
        const [nr, ng, nb] = labToRgb(L, newA, newB);
        data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;
        veinPx++;
      }
    } else if (L > 8 && chroma > 4) {
      // iris: rotate hue from near-red (~20-40deg in this texture) toward a warmer brown (~55deg),
      // reduce chroma moderately so it reads as a natural brown, not a saturated red-brown.
      const targetHueRad = (55 * Math.PI) / 180;
      const blend = 0.6; // partial rotation toward target, keeps natural per-pixel hue variation (flecks) rather than flattening to one hue
      const curHueRad = (hueDeg * Math.PI) / 180;
      const newHueRad = curHueRad + (targetHueRad - curHueRad) * blend;
      const newChroma = chroma * 0.8;
      const newA = Math.cos(newHueRad) * newChroma;
      const newB = Math.sin(newHueRad) * newChroma;
      const [nr, ng, nb] = labToRgb(L, newA, newB);
      data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;
      irisPx++;
    }
  }
  await sharp(data, { raw: { width, height, channels } }).png().toFile(outPath);
  console.log("eye recolored ->", outPath, "vein px desaturated:", veinPx, "iris px rehued:", irisPx);
}

(async () => {
  const OUT = path.join(__dirname, "phase18-textures");
  require("fs").mkdirSync(OUT, { recursive: true });
  await recolorEye(
    "C:/Users/Admin/AppData/Roaming/Blender Foundation/Blender/4.5/extensions/.user/user_default/mpfb/data/eyes/materials/brown_eye.png",
    path.join(OUT, "NaturalBrownEye.png")
  );
  console.log("ALL DONE");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

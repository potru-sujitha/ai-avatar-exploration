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

async function recolorHair(inPath, outPath) {
  const img = sharp(inPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const [L, A, B] = rgbToLab(r, g, b);
    // Medium-brown target hue in Lab a/b space (~50-55deg), moderate chroma.
    // Keep L fully intact (multiplied, not clamped) to preserve every highlight/shadow strand already baked in.
    const targetHueRad = (62 * Math.PI) / 180;
    const chroma = Math.sqrt(A * A + B * B);
    const targetChroma = Math.min(chroma * 0.4, 16); // brown is inherently low-chroma; strong desaturation vs. vivid strawberry-orange
    const newA = Math.cos(targetHueRad) * targetChroma;
    const newB = Math.sin(targetHueRad) * targetChroma;
    const newL = L * 0.58; // medium brown is meaningfully darker than strawberry blonde; uniform multiply preserves relative highlight/shadow contrast
    const [nr, ng, nb] = labToRgb(newL, newA, newB);
    data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;
  }
  await sharp(data, { raw: { width, height, channels } }).png().toFile(outPath);
  console.log("hair recolored ->", outPath);
}

async function recolorSkin(inPath, outPath) {
  const img = sharp(inPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const [L, A, B] = rgbToLab(r, g, b);
    // Reduce overall brightness (uniform multiply, preserves shading/detail ratio) + shift modestly warmer, not orange.
    const newL = L * 0.9;
    const newA = A + 2.5; // slightly more red/warm
    const newB = B + 2.0; // slightly more yellow/warm, kept small to avoid an orange cast
    const [nr, ng, nb] = labToRgb(newL, newA, newB);
    data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;
  }
  await sharp(data, { raw: { width, height, channels } }).png().toFile(outPath);
  console.log("skin recolored ->", outPath);
}

async function recolorSuit(inPath, outPath) {
  const img = sharp(inPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let darkened = 0, kept = 0;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (lum < 210) { // the dark pinstripe fabric regions -- push toward near-black, keep faint pinstripe pattern
      data[i] = Math.round(r * 0.22);
      data[i + 1] = Math.round(g * 0.22);
      data[i + 2] = Math.round(b * 0.22);
      darkened++;
    } else {
      kept++; // the white collar, buttons, and decorative accent stay untouched
    }
  }
  await sharp(data, { raw: { width, height, channels } }).png().toFile(outPath);
  console.log("suit recolored ->", outPath, "darkened px:", darkened, "kept px:", kept);
}

(async () => {
  const OUT = path.join(__dirname, "phase13b-textures");
  require("fs").mkdirSync(OUT, { recursive: true });
  await recolorHair(
    "C:/Users/Admin/AppData/Roaming/Blender Foundation/Blender/4.5/extensions/.user/user_default/mpfb/data/hair/toigo_blunt_bob/StrawberryBlondHair.png",
    path.join(OUT, "MediumBrownHair.png")
  );
  await recolorSkin(
    "C:/Users/Admin/AppData/Roaming/Blender Foundation/Blender/4.5/extensions/.user/user_default/mpfb/data/skins/young_caucasian_female/young_lightskinned_female_diffuse.png",
    path.join(OUT, "WarmNeutralSkin.png")
  );
  await recolorSuit(
    "C:/Users/Admin/AppData/Roaming/Blender Foundation/Blender/4.5/extensions/.user/user_default/mpfb/data/clothes/toigo_female_suit/MHSuitsFem-diff.png",
    path.join(OUT, "BlackSuitWhiteCollar.png")
  );
  console.log("ALL DONE");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

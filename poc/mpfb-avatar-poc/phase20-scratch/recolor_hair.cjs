const sharp = require('sharp');
const path = require('path');

const SRC = 'C:/Users/Admin/AppData/Roaming/Blender Foundation/Blender/4.5/extensions/.user/user_default/mpfb/data/hair/long01/long01_diffuse.png';
const OUT = path.join(__dirname, 'long01_diffuse_recolored.png');

// sRGB -> linear
function srgbToLinear(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function linearToSrgb(c) { c = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.max(0, Math.min(255, c * 255)); }

// linear RGB -> XYZ (D65) -> Lab
function rgbToLab(r, g, b) {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
  const Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
  const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116));
  const fx = f(X / Xn), fy = f(Y / Yn), fz = f(Z / Zn);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function labToRgb(L, a, b) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const fi = (t) => (t * t * t > 0.008856 ? t * t * t : (t - 16 / 116) / 7.787);
  const Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
  const X = fi(fx) * Xn, Y = fi(fy) * Yn, Z = fi(fz) * Zn;
  const R = X * 3.2404542 + Y * -1.5371385 + Z * -0.4985314;
  const G = X * -0.9692660 + Y * 1.8760108 + Z * 0.0415560;
  const B = X * 0.0556434 + Y * -0.2040259 + Z * 1.0572252;
  return [linearToSrgb(R), linearToSrgb(G), linearToSrgb(B)];
}

// Rotate hue in the a*/b* plane by angle (degrees), preserving L and chroma magnitude.
const HUE_SHIFT_DEG = 13; // from ~15deg (copper) toward ~28deg (neutral brown)
const rad = HUE_SHIFT_DEG * Math.PI / 180;
const cosA = Math.cos(rad), sinA = Math.sin(rad);

sharp(SRC).raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const a = channels > 3 ? data[i + 3] : 255;
    if (a < 10) continue; // skip fully transparent
    const [L, A, B] = rgbToLab(r, g, b);
    // rotate (A,B) -- increasing hue angle from red(0)/orange toward yellow moves toward more "brown/neutral"
    const newA = A * cosA - B * sinA;
    const newB = A * sinA + B * cosA;
    const [nr, ng, nb] = labToRgb(L, newA, newB);
    data[i] = Math.round(nr); data[i + 1] = Math.round(ng); data[i + 2] = Math.round(nb);
  }
  return sharp(data, { raw: { width, height, channels } }).png().toFile(OUT);
}).then(() => {
  console.log('wrote', OUT);
  // verify new sampled hue
  return sharp(OUT).raw().toBuffer({ resolveWithObject: true });
}).then(({ data, info }) => {
  const { width, height, channels } = info;
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = 0; y < height; y += 37) for (let x = 0; x < width; x += 37) {
    const i = (y * width + x) * channels;
    const a = channels > 3 ? data[i + 3] : 255;
    if (a < 50) continue;
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  r /= n; g /= n; b /= n;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let h = 0;
  if (delta > 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) h += 360;
  console.log('new avg RGB:', r.toFixed(1), g.toFixed(1), b.toFixed(1), '  hue:', h.toFixed(1), 'deg');
}).catch(e => { console.error('FATAL', e); process.exit(1); });

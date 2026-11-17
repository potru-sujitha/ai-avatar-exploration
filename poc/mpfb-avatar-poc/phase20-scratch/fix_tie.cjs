const sharp = require('sharp');
const path = require('path');

const DIFF_SRC = path.join(__dirname, '..', 'phase16-textures', 'Suit2Black.png');
const NORM_SRC = path.join(__dirname, '..', 'phase16-textures', 'Suit2NormNoTie.png');
const DIFF_OUT = path.join(__dirname, 'Suit2Black_v2.png');
const NORM_OUT = path.join(__dirname, 'Suit2NormNoTie_v2.png');

const JACKET = [30, 30, 30];
const FLAT_NORMAL = [128, 128, 255]; // tangent-space "up" = no relief

// Generous bounding box around the tie/ascot shape (original 2048x2048 coords),
// derived from the viewed texture: shape spans roughly x:1150-1620, y:380-850.
const BOX = { x0: 1100, y0: 350, x1: 1650, y1: 900 };

function recolorBox(srcPath, outPath, targetColor, isNormalMap) {
  return sharp(srcPath).raw().toBuffer({ resolveWithObject: true }).then(({ data, info }) => {
    const { width, height, channels } = info;
    let changed = 0;
    for (let y = BOX.y0; y < BOX.y1 && y < height; y++) {
      for (let x = BOX.x0; x < BOX.x1 && x < width; x++) {
        const i = (y * width + x) * channels;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const bright = (r + g + b) / 3;
        // For the diffuse map: recolor anything bright (the white tie/ascot) to jacket black.
        // For the normal map: recolor anything that deviates from flat "up" (128,128,255-ish) to flat.
        const isTarget = isNormalMap
          ? (Math.abs(r - 128) > 8 || Math.abs(g - 128) > 8 || b < 240)
          : (bright > 100);
        if (isTarget) {
          data[i] = targetColor[0]; data[i + 1] = targetColor[1]; data[i + 2] = targetColor[2];
          changed++;
        }
      }
    }
    console.log(outPath, 'pixels changed:', changed);
    return sharp(data, { raw: { width, height, channels } }).png().toFile(outPath);
  });
}

Promise.all([
  recolorBox(DIFF_SRC, DIFF_OUT, JACKET, false),
  recolorBox(NORM_SRC, NORM_OUT, FLAT_NORMAL, true),
]).then(() => console.log('done')).catch(e => { console.error('FATAL', e); process.exit(1); });

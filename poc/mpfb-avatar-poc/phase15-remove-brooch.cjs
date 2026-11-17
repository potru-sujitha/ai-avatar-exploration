const sharp = require("sharp");
const path = require("path");

const SRC = path.join(__dirname, "phase13b-textures", "BlackSuitWhiteCollar.png");
const OUT = path.join(__dirname, "phase15-textures", "SimplifiedBlackSuitNoBrooch.png");

// Region covering the cameo head (~x1691-1978,y652-1012) + its gold/dark oval frame
// (~x1500-2014,y1092-1802) in the 2048x2048 atlas, found by direct visual inspection of
// BlackSuitWhiteCollar.png. Generous margin on all sides; stops well above the button
// row (~y1870+) so buttons are untouched. Filled with the same near-black used for the
// jacket fabric elsewhere in this texture (confirmed by sampling fabric pixels directly),
// not an arbitrary color -- so the brooch's former UV island reads as plain jacket, not a
// visibly different patch.
// Expanded after a render still showed a faint residual outline -- the first rectangle's
// edges clipped the cameo/frame artwork's own anti-aliased border pixels. Widened on all
// sides to fully clear it.
const REGION = { left: 1430, top: 540, width: 2048 - 1430, height: 1880 - 540 };
// CORRECTED after an actual browser render showed the brooch's UV region renders at the
// collar/neckline in 3D, not against the jacket -- filling with jacket-black produced an
// obvious black oval blob on the white collar, worse than the original brooch. Collar
// white sampled directly from this same texture (see log) is used instead, so the former
// brooch faces blend into the surrounding collar fabric instead of standing out.
const FABRIC_BLACK = { r: 8, g: 8, b: 9, alpha: 1 }; // kept for reference/log only, unused below
const COLLAR_WHITE = { r: 235, g: 235, b: 232, alpha: 1 };

(async () => {
  const img = sharp(SRC);
  const meta = await img.metadata();
  console.log("source size:", meta.width, meta.height);

  // Sample the actual collar-white pixel from this same texture, not a guessed value.
  const collarSample = await sharp(SRC).extract({ left: 1590, top: 85, width: 4, height: 4 }).raw().toBuffer();
  console.log("sampled collar-white pixel:", collarSample[0], collarSample[1], collarSample[2]);
  const fill = { r: collarSample[0], g: collarSample[1], b: collarSample[2] };

  const overlay = Buffer.from(
    new Array(REGION.width * REGION.height).fill([fill.r, fill.g, fill.b, 255]).flat()
  );
  const overlayPng = await sharp(overlay, { raw: { width: REGION.width, height: REGION.height, channels: 4 } })
    .png().toBuffer();

  await sharp(SRC)
    .composite([{ input: overlayPng, left: REGION.left, top: REGION.top }])
    .png()
    .toFile(OUT);

  console.log("wrote", OUT, "with brooch region filled collar-white:", REGION, fill);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

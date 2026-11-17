const sharp = require("sharp");
const path = require("path");

const SRC = path.join(__dirname, "..", "..", "..", "..", "AppData", "Roaming",
  "Blender Foundation", "Blender", "4.5", "extensions", ".user", "user_default",
  "mpfb", "data", "clothes", "toigo_female_suit", "MHSuitsFem-bump.png");
const SRC_ABS = "C:/Users/Admin/AppData/Roaming/Blender Foundation/Blender/4.5/extensions/.user/user_default/mpfb/data/clothes/toigo_female_suit/MHSuitsFem-bump.png";
const OUT = path.join(__dirname, "phase15-textures", "SuitBumpNoBrooch.png");

// Same UV-space rectangle used for the diffuse-map brooch removal (both textures share the
// same 2048x2048 UV layout). Confirmed by direct inspection: the collar region in THIS bump
// map is pure white (255,255,255) -- i.e. "flat, no relief" is encoded as white here, not
// mid-gray -- so filling the former cameo+frame region with white matches how the rest of
// the flat collar/background already reads, rather than guessing a neutral value.
const REGION = { left: 1430, top: 540, width: 2048 - 1430, height: 1880 - 540 };

(async () => {
  const flatSample = await sharp(SRC_ABS).extract({ left: 1590, top: 85, width: 4, height: 4 }).raw().toBuffer();
  console.log("sampled known-flat collar pixel in bump map (expect white):", flatSample[0], flatSample[1], flatSample[2]);
  const fill = { r: flatSample[0], g: flatSample[1], b: flatSample[2] };

  const overlay = Buffer.from(
    new Array(REGION.width * REGION.height).fill([fill.r, fill.g, fill.b, 255]).flat()
  );
  const overlayPng = await sharp(overlay, { raw: { width: REGION.width, height: REGION.height, channels: 4 } })
    .png().toBuffer();

  await sharp(SRC_ABS)
    .composite([{ input: overlayPng, left: REGION.left, top: REGION.top }])
    .png()
    .toFile(OUT);

  console.log("wrote", OUT, "brooch region flattened to", fill, REGION);
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

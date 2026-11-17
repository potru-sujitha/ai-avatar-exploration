const fs = require("fs");

function patchGlbAlphaMode(inPath, outPath, mode, cutoff) {
  const buf = fs.readFileSync(inPath);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStart = 20;
  const jsonBuf = buf.slice(jsonStart, jsonStart + jsonLen);
  const json = JSON.parse(jsonBuf.toString("utf8"));
  json.materials.forEach((m) => {
    m.alphaMode = mode;
    if (mode === "MASK") m.alphaCutoff = cutoff;
    else delete m.alphaCutoff;
  });
  let newJsonStr = JSON.stringify(json);
  // pad to 4-byte boundary with spaces (glTF JSON chunk padding requirement)
  while (newJsonStr.length % 4 !== 0) newJsonStr += " ";
  const newJsonBuf = Buffer.from(newJsonStr, "utf8");

  const binChunkStart = jsonStart + jsonLen;
  const binChunk = buf.slice(binChunkStart); // includes its own 8-byte header + data, unchanged

  const newJsonChunkLen = newJsonBuf.length;
  const header = Buffer.alloc(12);
  header.write("glTF", 0);
  header.writeUInt32LE(2, 4); // version
  const totalLen = 12 + 8 + newJsonChunkLen + binChunk.length;
  header.writeUInt32LE(totalLen, 8);

  const jsonChunkHeader = Buffer.alloc(8);
  jsonChunkHeader.writeUInt32LE(newJsonChunkLen, 0);
  jsonChunkHeader.write("JSON", 4);

  const out = Buffer.concat([header, jsonChunkHeader, newJsonBuf, binChunk]);
  fs.writeFileSync(outPath, out);
  console.log("wrote", outPath, "alphaMode=", mode, "materials patched:", json.materials.length);
}

patchGlbAlphaMode("minimal_suit.glb", "mask_patched_suit.glb", "MASK", 0.5);
patchGlbAlphaMode("minimal_mouth.glb", "mask_patched_mouth.glb", "MASK", 0.5);

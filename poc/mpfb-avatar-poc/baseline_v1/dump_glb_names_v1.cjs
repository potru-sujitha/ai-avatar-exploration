const fs = require("fs");

function parseGLB(path) {
  const buf = fs.readFileSync(path);
  // 12-byte header: magic, version, length
  const jsonChunkLength = buf.readUInt32LE(12);
  const jsonChunkStart = 20;
  const jsonText = buf.toString("utf8", jsonChunkStart, jsonChunkStart + jsonChunkLength);
  return JSON.parse(jsonText);
}

const path = process.argv[2];
const gltf = parseGLB(path);

console.log("=== " + path + " ===");

// Morph target names come from mesh.extras.targetNames (standard glTF convention)
const morphNames = new Set();
for (const mesh of gltf.meshes || []) {
  for (const prim of mesh.primitives || []) {
    if (prim.extras && prim.extras.targetNames) {
      prim.extras.targetNames.forEach((n) => morphNames.add(n));
    }
  }
  if (mesh.extras && mesh.extras.targetNames) {
    mesh.extras.targetNames.forEach((n) => morphNames.add(n));
  }
}
const sortedMorphs = [...morphNames].sort();
console.log("Morph target count:", sortedMorphs.length);
console.log("Has viseme_* names:", sortedMorphs.filter(n => n.startsWith("viseme_")));
console.log("Has ARKit-style names (sample):", sortedMorphs.filter(n => /^(brow|eye|jaw|mouth|cheek|nose|tongue)/i.test(n)).slice(0, 60));
console.log("Has raw Rocketbox-style names (AA_VI_/AK_):", sortedMorphs.filter(n => /^(AA_VI_|AK_)/.test(n)));

// Bone/node names
const nodeNames = (gltf.nodes || []).map(n => n.name).filter(Boolean);
console.log("\nTotal node count:", nodeNames.length);
console.log("Sample node names (first 30):", nodeNames.slice(0, 30));
console.log("Has Mixamo-style names (mixamorig prefix):", nodeNames.filter(n => /mixamorig/i.test(n)).length);
console.log("Has plain Mixamo-compatible names (Hips/Spine/Head/LeftArm etc, no prefix):",
  ["Hips","Spine","Spine1","Spine2","Neck","Head","LeftArm","RightArm","LeftEye","RightEye"].filter(n => nodeNames.includes(n)));

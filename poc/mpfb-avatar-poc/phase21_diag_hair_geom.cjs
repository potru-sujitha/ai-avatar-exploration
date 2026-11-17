const fs = require("fs");

function loadGlb(path) {
  const buf = fs.readFileSync(path);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStart = 20;
  const json = JSON.parse(buf.slice(jsonStart, jsonStart + jsonLen).toString("utf8"));
  return json;
}

const json = loadGlb("avatar_v12.glb");

console.log("=== Materials matching 'hair'/'long' ===");
json.materials.forEach((m, i) => {
  if (/hair|long/i.test(m.name || "")) console.log(i, m.name);
});

console.log("\n=== Meshes/primitives using hair materials ===");
const hairMatIdx = json.materials
  .map((m, i) => ({ i, name: m.name }))
  .filter((m) => /hair|long/i.test(m.name || ""))
  .map((m) => m.i);

json.meshes.forEach((mesh, mi) => {
  mesh.primitives.forEach((prim, pi) => {
    if (hairMatIdx.includes(prim.material)) {
      const posAccessor = json.accessors[prim.attributes.POSITION];
      const idxAccessor = prim.indices !== undefined ? json.accessors[prim.indices] : null;
      const vertCount = posAccessor.count;
      const triCount = idxAccessor ? idxAccessor.count / 3 : vertCount / 3;
      console.log(`mesh[${mi}] "${mesh.name}" primitive[${pi}]: material=${json.materials[prim.material].name}, vertices=${vertCount}, triangles=${triCount}`);
    }
  });
});

console.log("\n=== Nodes referencing these meshes (check for duplicate instances) ===");
json.nodes.forEach((node, ni) => {
  if (node.mesh !== undefined) {
    const mesh = json.meshes[node.mesh];
    const usesHair = mesh.primitives.some((p) => hairMatIdx.includes(p.material));
    if (usesHair) console.log(`node[${ni}] "${node.name}" -> mesh[${node.mesh}] "${mesh.name}"`);
  }
});

console.log("\n=== Hair texture dimensions ===");
const hairMat = json.materials.find((m) => /hair|long/i.test(m.name || ""));
if (hairMat && hairMat.pbrMetallicRoughness && hairMat.pbrMetallicRoughness.baseColorTexture) {
  const texIdx = hairMat.pbrMetallicRoughness.baseColorTexture.index;
  const imgIdx = json.textures[texIdx].source;
  console.log("baseColor image index:", imgIdx, json.images[imgIdx]);
}
console.log("Full material object:", JSON.stringify(hairMat, null, 1));

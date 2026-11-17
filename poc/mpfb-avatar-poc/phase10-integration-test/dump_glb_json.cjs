const fs = require("fs");
const path = require("path");

const glbPath = path.join(__dirname, "..", "avatar_v5.glb");
const buf = fs.readFileSync(glbPath);
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString("utf8"));

const targetMats = ["Human.female_elegantsuit01", "Human.teeth_base", "Human.tongue01", "Human.body"];
console.log("=== alpha mode for the four previously-fixed materials ===");
for (const name of targetMats) {
  const m = json.materials.find((x) => x.name === name);
  console.log(name, "->", m ? `alphaMode=${m.alphaMode || "OPAQUE(default)"} alphaCutoff=${m.alphaCutoff ?? "n/a"}` : "NOT FOUND");
}

console.log("\n=== bone names (skin joints), sample ===");
const skin = json.skins && json.skins[0];
if (skin) {
  const boneNames = skin.joints.map((j) => json.nodes[j].name);
  const mixamoLike = ["Hips", "Spine", "Neck", "Head", "LeftEye", "RightEye"];
  for (const b of mixamoLike) console.log(b, "present:", boneNames.includes(b));
  console.log("total joints:", boneNames.length);
} else {
  console.log("NO SKIN FOUND");
}

console.log("\n=== morph target names across all meshes ===");
const allMorphNames = new Set();
for (const mesh of json.meshes) {
  if (mesh.extras && mesh.extras.targetNames) {
    mesh.extras.targetNames.forEach((n) => allMorphNames.add(n));
  }
}
const visemeNames = [...allMorphNames].filter((n) => n.startsWith("viseme_"));
const arkitNames = [...allMorphNames].filter((n) => !n.startsWith("viseme_"));
console.log("viseme_* count:", visemeNames.length, visemeNames.sort());
console.log("non-viseme (ARKit+other) count:", arkitNames.length);

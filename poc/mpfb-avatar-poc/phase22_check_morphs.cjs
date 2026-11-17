const fs = require("fs");
const buf = fs.readFileSync("avatar_v12.glb");
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString("utf8"));
json.meshes.forEach((mesh, i) => {
  const prim = mesh.primitives[0];
  const targets = prim.targets ? prim.targets.length : 0;
  const node = json.nodes.find(n => n.mesh === i);
  console.log(`mesh[${i}] name="${mesh.name}" morphTargets=${targets} nodeName="${node ? node.name : '?'}"`);
});

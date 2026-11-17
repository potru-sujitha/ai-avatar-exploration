// Re-run the glTF Validator fresh against avatar_v5.glb for this phase's own evidence.
// Reuses the gltf-validator package already installed (read-only) in
// ../phase3-defect-investigation/node_modules -- no new dependency added anywhere.
const fs = require("fs");
const path = require("path");
const validator = require(path.join(__dirname, "..", "phase3-defect-investigation", "node_modules", "gltf-validator"));

const glbPath = path.join(__dirname, "..", "avatar_v5.glb");
const bytes = new Uint8Array(fs.readFileSync(glbPath));

validator.validateBytes(bytes).then((report) => {
  fs.writeFileSync(path.join(__dirname, "phase10_v5_validator_report.json"), JSON.stringify(report, null, 1));
  console.log("numErrors:", report.issues.numErrors, "numWarnings:", report.issues.numWarnings, "numInfos:", report.issues.numInfos);
}).catch((e) => { console.error("VALIDATOR ERROR", e); process.exit(1); });

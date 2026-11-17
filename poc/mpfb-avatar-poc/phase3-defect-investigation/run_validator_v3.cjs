const fs = require("fs");
const path = require("path");
const validator = require("./node_modules/gltf-validator");

const glbPath = path.join(__dirname, "..", "avatar_v3.glb");
const data = fs.readFileSync(glbPath);

validator.validateBytes(new Uint8Array(data), {
  uri: "avatar_v3.glb",
}).then((report) => {
  fs.writeFileSync(path.join(__dirname, "..", "v3_validator_report.json"), JSON.stringify(report, null, 1));
  console.log("numErrors:", report.issues.numErrors, "numWarnings:", report.issues.numWarnings, "numInfos:", report.issues.numInfos, "numHints:", report.issues.numHints);
}).catch((e) => { console.error("VALIDATOR FAILED", e); process.exit(1); });

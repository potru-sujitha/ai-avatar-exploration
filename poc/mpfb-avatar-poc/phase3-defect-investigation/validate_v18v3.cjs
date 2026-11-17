const { validateBytes } = require('./node_modules/gltf-validator');
const fs = require('fs');
const buf = fs.readFileSync('../avatar_v18_candidate_v3.glb');
validateBytes(new Uint8Array(buf)).then((report) => {
  console.log('numErrors:', report.issues.numErrors);
  console.log('numWarnings:', report.issues.numWarnings);
  console.log('numInfos:', report.issues.numInfos);
}).catch((e) => console.error('FAILED', e));

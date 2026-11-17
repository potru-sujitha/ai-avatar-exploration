const { validateBytes } = require('./node_modules/gltf-validator');
const fs = require('fs');
const buf = fs.readFileSync('../avatar_v18_candidate.glb');
validateBytes(new Uint8Array(buf)).then((report) => {
  console.log('numErrors:', report.issues.numErrors);
  console.log('numWarnings:', report.issues.numWarnings);
}).catch((e) => console.error('FAILED', e));

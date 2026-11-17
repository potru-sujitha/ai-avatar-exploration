const { validateBytes } = require('./node_modules/gltf-validator');
const fs = require('fs');
const buf = fs.readFileSync('../avatar_v19_candidate.glb');
validateBytes(new Uint8Array(buf)).then((report) => {
  console.log('numErrors:', report.issues.numErrors, 'numWarnings:', report.issues.numWarnings, 'numInfos:', report.issues.numInfos);
}).catch((e) => console.error('FAILED', e));

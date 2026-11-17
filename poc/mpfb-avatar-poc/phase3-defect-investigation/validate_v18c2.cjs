const { validateBytes } = require('./node_modules/gltf-validator');
const fs = require('fs');
const buf = fs.readFileSync('../avatar_v18_candidate_v2.glb');
validateBytes(new Uint8Array(buf)).then((report) => {
  console.log('numErrors:', report.issues.numErrors);
  console.log('numWarnings:', report.issues.numWarnings);
  console.log('numInfos:', report.issues.numInfos);
  if (report.issues.numErrors > 0) {
    console.log(JSON.stringify(report.issues.messages.filter(m => m.severity === 0), null, 1));
  }
}).catch((e) => console.error('FAILED', e));

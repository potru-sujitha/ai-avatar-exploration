const { validateBytes } = require('./phase3-defect-investigation/node_modules/gltf-validator');
const fs = require('fs');
const buf = fs.readFileSync('./avatar_v20_candidate.glb');
validateBytes(new Uint8Array(buf)).then((report) => {
  console.log('numErrors:', report.issues.numErrors, 'numWarnings:', report.issues.numWarnings, 'numInfos:', report.issues.numInfos);
  if (report.issues.numErrors > 0) {
    console.log(JSON.stringify(report.issues.messages.filter(m => m.severity === 0), null, 2));
  }
}).catch((e) => console.error('FAILED', e));

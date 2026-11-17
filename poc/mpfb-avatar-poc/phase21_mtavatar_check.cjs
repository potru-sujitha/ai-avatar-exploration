const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase21-demo.html?avatar=./avatar_v13.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const diag = await page.evaluate(() => {
    const h = window.__head;
    const o = h.mtAvatar['eyeBlinkLeft'];
    const v = h.mtAvatar['viseme_aa'];
    return {
      eyeBlinkLeft_ms_count: o && o.ms ? o.ms.length : 'no ms array',
      eyeBlinkLeft_value: o ? o.value : 'missing',
      eyeBlinkLeft_baseline: o ? o.baseline : 'missing',
      viseme_aa_ms_count: v && v.ms ? v.ms.length : 'no ms array',
      meshCount: (() => { let c = 0; h.armature.traverse(n => { if (n.isMesh) c++; }); return c; })(),
      meshesWithMorphs: (() => { const r = []; h.armature.traverse(n => { if (n.morphTargetDictionary) r.push({name: n.name, morphCount: Object.keys(n.morphTargetDictionary).length}); }); return r; })(),
    };
  });
  console.log(JSON.stringify(diag, null, 1));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

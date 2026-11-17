const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:8923/poc.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 30; i++) { if (await page.evaluate(() => window.__ready)) break; await new Promise(r=>setTimeout(r,300)); }
  const result = await page.evaluate(async () => {
    const h = window.__head;
    let mesh = null;
    h.armature.traverse(o => { if (o.morphTargetDictionary && o.morphTargetDictionary.viseme_aa !== undefined) mesh = o; });
    const idx = mesh.morphTargetDictionary['viseme_aa'];
    if (h.audioCtx.state === 'suspended') await h.audioCtx.resume();
    h.speakAudio({ audio: window.__audioBuffer, visemes: ['aa'], vtimes: [500], vdurations: [2000] });
    const samples = [];
    for (let i = 0; i < 20; i++) {
      samples.push(mesh.morphTargetInfluences[idx]);
      await new Promise(r => setTimeout(r, 200));
    }
    return samples;
  });
  console.log("direct mesh morphTargetInfluences samples:", JSON.stringify(result));
  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });

const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:8924/phase10-integration-test/test_original.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate(() => window.__ready === true);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const info = await page.evaluate(() => {
    const results = [];
    window.__head.armature.traverse((o) => {
      if (o.morphTargetDictionary) {
        const keys = Object.keys(o.morphTargetDictionary);
        const visemes = keys.filter(k => k.startsWith('viseme_'));
        const others = keys.filter(k => !k.startsWith('viseme_'));
        results.push({ name: o.name, visemeCount: visemes.length, otherCount: others.length, others: others.sort() });
      }
    });
    return results;
  });
  for (const r of info) console.log(r.name, "| visemes:", r.visemeCount, "| other:", r.otherCount);
  // find the max
  const maxOther = Math.max(...info.map(r => r.otherCount));
  const meshWithMax = info.find(r => r.otherCount === maxOther);
  console.log("\nmesh with most 'other' morphs:", meshWithMax.name, meshWithMax.otherCount);
  console.log(JSON.stringify(meshWithMax.others));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

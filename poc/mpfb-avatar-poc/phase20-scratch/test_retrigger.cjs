const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => window.__ready === true).catch(()=>false)) break;
    await new Promise(r => setTimeout(r, 200));
  }
  await new Promise(r => setTimeout(r, 2000)); // let it render for real first, matching Phase 17's finding
  // External retrigger, matching Phase 17's confirmed-working technique
  const result = await page.evaluate(() => {
    const h = window.__head;
    let count = 0;
    h.armature.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m.map) { m.map.needsUpdate = true; count++; }
        if (m.normalMap) { m.normalMap.needsUpdate = true; count++; }
      }
    });
    return count;
  });
  console.log("retriggered textures:", result);
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: "phase20-scratch/after_retrigger.png" });
  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });

const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 700, height: 700 });
  await page.goto("http://localhost:8924/phase17-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: 0.5, cameraY: 0.3, cameraX: 0.25 }); });
  await new Promise((r) => setTimeout(r, 1300));
  await page.screenshot({ path: "phase17_debug_t1_already_aniso1.png" });

  // Now force it UP to 16 then back DOWN to 1 with fresh needsUpdate, mimicking the earlier test's sequence.
  await page.evaluate(() => {
    const h = window.__head;
    h.armature.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m.name && m.name.toLowerCase().includes('suit') && m.map) {
          m.map.anisotropy = 16; m.map.needsUpdate = true;
        }
      });
    });
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase17_debug_t2_forced_to_16.png" });

  await page.evaluate(() => {
    const h = window.__head;
    h.armature.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m.name && m.name.toLowerCase().includes('suit') && m.map) {
          m.map.anisotropy = 1; m.map.needsUpdate = true;
        }
      });
    });
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase17_debug_t3_back_to_1.png" });

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

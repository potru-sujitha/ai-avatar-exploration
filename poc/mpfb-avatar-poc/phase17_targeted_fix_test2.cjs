const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 700, height: 700 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v10.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await page.evaluate(() => {
    const h = window.__head;
    h.armature.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m.name && m.name.toLowerCase().includes('suit')) {
          if (m.map) { m.map.anisotropy = 1; m.map.needsUpdate = true; }
        }
      });
    });
  });
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: 0.5, cameraY: 0.3, cameraX: 0.25 }); });
  await new Promise((r) => setTimeout(r, 1300));
  await page.screenshot({ path: "phase17_test_diffuse_aniso_off_only.png" });
  console.log("DONE");
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

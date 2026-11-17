const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.setViewport({ width: 700, height: 700 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v10.glb", { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  // Targeted fix: leave diffuse map anisotropy at 16 (preserves Phase 6/7's anti-moiré fix),
  // only drop the NORMAL map's anisotropy to 1.
  const applied = await page.evaluate(() => {
    const h = window.__head;
    let info = [];
    h.armature.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m.name && m.name.toLowerCase().includes('suit')) {
          if (m.normalMap) { m.normalMap.anisotropy = 1; m.normalMap.needsUpdate = true; }
          info.push({ mat: m.name, mapAniso: m.map ? m.map.anisotropy : null, normalMapAniso: m.normalMap ? m.normalMap.anisotropy : null });
        }
      });
    });
    return info;
  });
  console.log("applied targeted fix:", JSON.stringify(applied));

  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: 0.5, cameraY: 0.3, cameraX: 0.25 }); });
  await new Promise((r) => setTimeout(r, 1300));
  await page.screenshot({ path: "phase17_targeted_fix_shoulder.png" });

  // Also capture a normal (non-zoomed) framing to confirm overall clothing still looks clean (no moiré regression).
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: 0.8, cameraY: 0.45, cameraX: 0 }); });
  await new Promise((r) => setTimeout(r, 1300));
  await page.screenshot({ path: "phase17_targeted_fix_full.png" });

  console.log("DONE");
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

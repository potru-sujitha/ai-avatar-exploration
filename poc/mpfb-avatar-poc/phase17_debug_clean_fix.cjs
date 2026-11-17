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
  // Restore suit diffuse to FULL anisotropy (undo the Phase17 exception), then re-trigger needsUpdate on ALL textures.
  await page.evaluate(() => {
    const h = window.__head;
    const maxAniso = h.renderer.capabilities.getMaxAnisotropy();
    h.armature.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        ['map','normalMap','roughnessMap','metalnessMap','aoMap'].forEach((k) => {
          if (m[k]) { m[k].anisotropy = maxAniso; m[k].needsUpdate = true; }
        });
      });
    });
  });
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: 0.5, cameraY: 0.3, cameraX: 0.25 }); });
  await new Promise((r) => setTimeout(r, 1300));
  await page.screenshot({ path: "phase17_clean_fix_full_aniso_retriggered.png" });
  const anisoCheck = await page.evaluate(() => {
    const h = window.__head; let out=[];
    h.armature.traverse((o) => { if (!o.isMesh||!o.material) return; const mats=Array.isArray(o.material)?o.material:[o.material];
      mats.forEach((m)=>{ if(m.name&&m.name.toLowerCase().includes('suit')) out.push({mat:m.name, mapAniso:m.map?m.map.anisotropy:null}); }); });
    return out;
  });
  console.log(JSON.stringify(anisoCheck));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

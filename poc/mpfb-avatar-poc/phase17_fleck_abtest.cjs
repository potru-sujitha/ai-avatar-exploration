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
  console.log("ready:", ready);

  // Find the suit mesh/material for targeted manipulation.
  const suitInfo = await page.evaluate(() => {
    const h = window.__head;
    let found = [];
    h.armature.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m.name && m.name.toLowerCase().includes('suit')) {
          found.push({ meshName: o.name, matName: m.name, hasNormalMap: !!m.normalMap, anisotropy: m.map ? m.map.anisotropy : null, normalScale: m.normalScale ? [m.normalScale.x, m.normalScale.y] : null });
        }
      });
    });
    return found;
  });
  console.log("suit materials found:", JSON.stringify(suitInfo, null, 1));

  // Zoom camera toward the shoulder region for a close crop, matching the known fleck screenshot framing.
  async function shoulderShot(path) {
    await page.evaluate(() => { window.__head.setView('head', { cameraDistance: 0.5, cameraY: 0.3, cameraX: 0.25 }); });
    await new Promise((r) => setTimeout(r, 1300));
    await page.screenshot({ path });
  }

  await shoulderShot("phase17_AB_baseline.png");
  console.log("captured baseline (current state, normal map + anisotropy active)");

  // Test A: disable normal map entirely on the suit material.
  await page.evaluate(() => {
    const h = window.__head;
    h.armature.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m.name && m.name.toLowerCase().includes('suit')) {
          m.__savedNormalMap = m.normalMap;
          m.normalMap = null;
          m.needsUpdate = true;
        }
      });
    });
  });
  await shoulderShot("phase17_AB_no_normalmap.png");
  console.log("captured test A: normal map disabled");

  // Restore normal map, then Test B: force anisotropy to 1 (disable anisotropic filtering).
  await page.evaluate(() => {
    const h = window.__head;
    h.armature.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m.name && m.name.toLowerCase().includes('suit')) {
          if (m.__savedNormalMap !== undefined) { m.normalMap = m.__savedNormalMap; }
          m.needsUpdate = true;
          ['map','normalMap','roughnessMap','metalnessMap'].forEach((k) => { if (m[k]) { m[k].anisotropy = 1; m[k].needsUpdate = true; } });
        }
      });
    });
  });
  await shoulderShot("phase17_AB_no_aniso.png");
  console.log("captured test B: normal map restored, anisotropy forced to 1");

  // Test C: both normal map disabled AND anisotropy forced to 1.
  await page.evaluate(() => {
    const h = window.__head;
    h.armature.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m.name && m.name.toLowerCase().includes('suit')) {
          m.normalMap = null;
          m.needsUpdate = true;
        }
      });
    });
  });
  await shoulderShot("phase17_AB_no_normalmap_no_aniso.png");
  console.log("captured test C: both disabled");

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

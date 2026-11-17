const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase17-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);
  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NONE');
  console.log("status:", status);
  const anisoCheck = await page.evaluate(() => {
    const h = window.__head; let out=[];
    h.armature.traverse((o) => { if (!o.isMesh||!o.material) return; const mats=Array.isArray(o.material)?o.material:[o.material];
      mats.forEach((m)=>{ if(m.name&&m.name.toLowerCase().includes('suit')) out.push({mat:m.name, mapAniso:m.map?m.map.anisotropy:null, normalAniso:m.normalMap?m.normalMap.anisotropy:null}); }); });
    return out;
  });
  console.log("aniso state:", JSON.stringify(anisoCheck));
  // allow the rAF re-trigger pass to land
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: 0.5, cameraY: 0.3, cameraX: 0.25 }); });
  await new Promise((r) => setTimeout(r, 1300));
  await page.screenshot({ path: "phase17_FINAL_shoulder.png" });
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: 0.8, cameraY: 0.45, cameraX: 0 }); });
  await new Promise((r) => setTimeout(r, 1300));
  await page.screenshot({ path: "phase17_FINAL_neutral.png" });
  console.log("errors:", errors.length);
  errors.forEach(e => console.log(e));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

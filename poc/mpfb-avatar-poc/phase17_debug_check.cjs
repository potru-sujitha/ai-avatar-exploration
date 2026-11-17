const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  await page.setViewport({ width: 900, height: 760 });
  await page.goto("http://localhost:8924/phase17-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const info = await page.evaluate(() => {
    const h = window.__head;
    let out = [];
    h.armature.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (m.name && m.name.toLowerCase().includes('suit')) {
          out.push({ mesh: o.name, mat: m.name, mapAniso: m.map ? m.map.anisotropy : null, mapUUID: m.map ? m.map.uuid : null, normalAniso: m.normalMap ? m.normalMap.anisotropy : null });
        }
      });
    });
    return out;
  });
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

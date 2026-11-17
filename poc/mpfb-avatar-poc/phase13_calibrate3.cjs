const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 720 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v5.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => window.__ready === true)) break; await new Promise((r) => setTimeout(r, 300)); }
  const tries = [
    { name: "y040_d06", cameraY: 0.40, cameraDistance: 0.6 },
    { name: "y045_d08", cameraY: 0.45, cameraDistance: 0.8 },
  ];
  for (const t of tries) {
    await page.evaluate((t) => { window.__head.setView('head', { cameraDistance: t.cameraDistance, cameraY: t.cameraY, cameraX: 0 }); }, t);
    await new Promise((r) => setTimeout(r, 1300));
    await page.screenshot({ path: `phase13_cal3_${t.name}.png` });
    console.log("captured", t.name);
  }
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

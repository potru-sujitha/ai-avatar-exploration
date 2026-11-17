const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 720 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v5.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate(() => window.__ready === true)) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const tries = [
    { name: "y010_d00", cameraY: 0.10, cameraDistance: 0.0 },
    { name: "y025_d02", cameraY: 0.25, cameraDistance: 0.2 },
    { name: "y035_d04", cameraY: 0.35, cameraDistance: 0.4 },
  ];
  for (const t of tries) {
    await page.evaluate((t) => { window.__head.setView('head', { cameraDistance: t.cameraDistance, cameraY: t.cameraY, cameraX: 0 }); }, t);
    await new Promise((r) => setTimeout(r, 1300));
    await page.screenshot({ path: `phase13_cal2_${t.name}.png` });
    console.log("captured", t.name);
  }
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8923/poc.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 30; i++) { if (await page.evaluate(() => window.__ready)) break; await new Promise(r=>setTimeout(r,300)); }
  await page.evaluate(() => { window.__head.armature.rotation.y = -0.55; });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: "three_quarter.png" });
  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });

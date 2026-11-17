const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/poc.html?avatar=avatar_v4.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: -1.6 }); });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: "v4_closeup2.png" });
  console.log("captured v4_closeup2.png");
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

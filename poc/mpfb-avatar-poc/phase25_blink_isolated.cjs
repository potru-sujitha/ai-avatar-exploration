const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v14.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  let maxBlink = 0;
  for (let i = 0; i < 60; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      return Math.max(h.getValue('eyeBlinkLeft') || 0, h.getValue('eyeBlinkRight') || 0);
    });
    if (v > maxBlink) maxBlink = v;
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log("max blink value over 30s:", maxBlink);
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

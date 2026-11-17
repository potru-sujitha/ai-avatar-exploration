const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase26-demo.html?avatar=./phase30_fixed20.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);
  let maxBlink = 0;
  const t0 = Date.now();
  for (let i = 0; i < 44; i++) {
    const b = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft') || 0);
    if (b > maxBlink) maxBlink = b;
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log("ISOLATED blink max over 22s:", maxBlink, "elapsed:", Date.now()-t0);
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

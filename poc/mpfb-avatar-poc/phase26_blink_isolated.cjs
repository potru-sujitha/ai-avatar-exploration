const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase26-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);
  let blinkMax = 0;
  const samples = [];
  for (let i = 0; i < 22; i++) {
    const v = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft') || 0);
    samples.push(v.toFixed(2));
    if (v > blinkMax) blinkMax = v;
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log("isolated blink samples:", samples.join(","));
  console.log("ISOLATED blink max over 22s:", blinkMax.toFixed(3));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

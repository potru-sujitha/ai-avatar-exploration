const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 760 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v10.glb", { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  for (const val of [0, 0.08, 0.12, 0.18, 0.25]) {
    await page.evaluate((v) => { window.__head.setBaselineValue('mouthSmile', v); }, val);
    await new Promise((r) => setTimeout(r, 2200)); // let exponential smoothing settle
    const actual = await page.evaluate(() => window.__head.getValue('mouthSmile'));
    await page.screenshot({ path: `phase17_smile_${val}.png` });
    console.log(`target=${val} settled getValue(mouthSmile)=${actual}`);
  }

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

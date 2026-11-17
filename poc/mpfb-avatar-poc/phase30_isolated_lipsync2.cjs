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
  await page.click('#play');
  const names = ["viseme_aa","viseme_O","viseme_E","viseme_PP","viseme_I","viseme_U","viseme_SS","viseme_RR","viseme_nn","viseme_kk","viseme_CH","viseme_DD","viseme_FF","viseme_TH"];
  let peak = 0, peakName = null, peakT = 0;
  const t0 = Date.now();
  for (let i = 0; i < 80; i++) {
    const vals = await page.evaluate((ns) => ns.map(n => window.__head.getValue(n) || 0), names);
    vals.forEach((v, idx) => { if (v > peak) { peak = v; peakName = names[idx]; peakT = Date.now() - t0; } });
    await new Promise((r) => setTimeout(r, 50));
  }
  console.log("ISOLATED lipsync peak (dense, 4s, 14 visemes):", peak, peakName, "at t=", peakT, "ms");
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

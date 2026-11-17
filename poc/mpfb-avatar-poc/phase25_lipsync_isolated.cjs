const puppeteer = require("puppeteer");
const avatar = process.argv[2] || "./avatar_v14.glb";
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto(`http://localhost:8924/phase20-demo.html?avatar=${avatar}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await page.evaluate(() => { if (window.__head.audioCtx.state === 'suspended') window.__head.audioCtx.resume(); });
  await page.click('#play');
  let peak = 0;
  const names = ["viseme_aa", "viseme_PP", "viseme_O", "viseme_E", "viseme_kk", "viseme_I", "viseme_U", "viseme_SS", "viseme_CH", "viseme_DD", "viseme_FF", "viseme_RR", "viseme_TH", "viseme_nn"];
  for (let i = 0; i < 40; i++) {
    const v = await page.evaluate((names) => {
      const h = window.__head;
      return Math.max(...names.map(n => h.getValue(n) || 0));
    }, names);
    if (v > peak) peak = v;
    await new Promise((r) => setTimeout(r, 80));
  }
  console.log("avatar:", avatar, "| lip-sync peak over dense 40x80ms sampling:", peak);
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

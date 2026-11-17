const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("console", (m) => console.log("[console]", m.text()));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase21-demo.html?avatar=./avatar_v12.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await page.click('#play').catch(() => {});
  let maxViseme = 0;
  for (let i = 0; i < 15; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      return Math.max(h.getValue('viseme_aa')||0, h.getValue('viseme_PP')||0, h.getValue('viseme_O')||0);
    });
    if (v > maxViseme) maxViseme = v;
    await new Promise(r => setTimeout(r, 150));
  }
  console.log("v12 via phase21-demo.html lip-sync max:", maxViseme);
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

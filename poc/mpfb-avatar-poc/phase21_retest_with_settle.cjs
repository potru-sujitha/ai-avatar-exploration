const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase21-demo.html?avatar=./avatar_v13.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("waiting 5s settle time before testing...");
  await new Promise(r => setTimeout(r, 5000));
  const clockCheck1 = await page.evaluate(() => window.__head.animClock);
  await new Promise(r => setTimeout(r, 500));
  const clockCheck2 = await page.evaluate(() => window.__head.animClock);
  console.log("post-settle clock delta:", clockCheck2 - clockCheck1);

  await page.click('#play').catch(() => {});
  let maxViseme = 0;
  for (let i = 0; i < 20; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      return Math.max(h.getValue('viseme_aa')||0, h.getValue('viseme_PP')||0, h.getValue('viseme_O')||0, h.getValue('viseme_E')||0);
    });
    if (v > maxViseme) maxViseme = v;
    await new Promise(r => setTimeout(r, 150));
  }
  console.log("lip-sync max (after 5s settle):", maxViseme, maxViseme > 0.1 ? "PASS" : "FAIL");

  let maxBlink = 0;
  for (let i = 0; i < 60; i++) {
    const v = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft') || 0);
    if (v > maxBlink) maxBlink = v;
    await new Promise(r => setTimeout(r, 200));
  }
  console.log("blink max (12s sample after settle+lipsync):", maxBlink, maxBlink > 0.8 ? "PASS" : "FAIL");

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

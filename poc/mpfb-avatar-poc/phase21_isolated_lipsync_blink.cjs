const puppeteer = require("puppeteer");

async function freshPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase21-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  return page;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });

  // Isolated lip-sync: fresh page, single play, no prior stop/restart cycle.
  {
    const page = await freshPage(browser);
    await page.click('#play').catch(() => {});
    let maxViseme = 0;
    for (let i = 0; i < 20; i++) {
      const v = await page.evaluate(() => {
        const h = window.__head;
        const names = ["viseme_aa","viseme_PP","viseme_O","viseme_E","viseme_kk","viseme_I","viseme_U","viseme_SS","viseme_FF"];
        return Math.max(...names.map(n => h.getValue(n) || 0));
      });
      if (v > maxViseme) maxViseme = v;
      await new Promise(r => setTimeout(r, 150));
    }
    console.log("ISOLATED lip-sync max viseme activation:", maxViseme, maxViseme > 0.1 ? "PASS" : "FAIL");
    await page.close();
  }

  // Isolated blink: fresh page, pure idle, no play/stop interaction at all.
  {
    const page = await freshPage(browser);
    let maxBlink = 0, events = 0, wasHigh = false;
    for (let i = 0; i < 110; i++) {
      const v = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft') || 0);
      if (v > maxBlink) maxBlink = v;
      if (v > 0.5 && !wasHigh) { events++; wasHigh = true; }
      if (v < 0.2) wasHigh = false;
      await new Promise(r => setTimeout(r, 200));
    }
    console.log("ISOLATED blink max:", maxBlink, "events:", events, maxBlink > 0.8 ? "PASS" : "FAIL");
    await page.close();
  }

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 720 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v6.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => window.__ready === true)) break; await new Promise((r) => setTimeout(r, 300)); }
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: "phase13_v6_neutral_final.png" });

  // Mid-speech: click play, poll for a nonzero viseme, screenshot right then.
  await page.click('#play');
  for (let i = 0; i < 20; i++) {
    const v = await page.evaluate(() => Math.max(window.__head.getValue('viseme_PP')||0, window.__head.getValue('viseme_O')||0, window.__head.getValue('viseme_aa')||0));
    if (v > 0.3) { await page.screenshot({ path: "phase13_v6_midspeech.png" }); console.log("mid-speech captured at v=", v); break; }
    await new Promise(r => setTimeout(r, 100));
  }
  await new Promise(r => setTimeout(r, 1500));
  await page.click('#stop');

  // Blink: trigger manual blink and capture.
  await page.click('#blink');
  await new Promise(r => setTimeout(r, 60));
  await page.screenshot({ path: "phase13_v6_blink.png" });

  // Gaze up/down.
  await page.click('#lookUp');
  await new Promise(r => setTimeout(r, 1300));
  await page.screenshot({ path: "phase13_v6_lookup.png" });
  await page.click('#lookDown');
  await new Promise(r => setTimeout(r, 1300));
  await page.screenshot({ path: "phase13_v6_lookdown.png" });
  await page.click('#lookCenter');

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

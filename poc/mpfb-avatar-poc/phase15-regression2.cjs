const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v9.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  // moods with full 9s settle (matches Phase 10's established convergence window)
  for (const [mood, key] of [["happy","mouthSmile"],["sad","mouthFrownLeft"],["fear","eyeWideLeft"]]) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise((r) => setTimeout(r, 9000));
    const v = await page.evaluate((k) => window.__head.getValue(k) || 0, key);
    console.log("MOOD(9s settle)", mood, key, "=", v.toFixed(3));
    await page.evaluate(() => window.__head.setMood('neutral'));
    await new Promise((r) => setTimeout(r, 500));
  }

  // gaze lookDown x4 fresh trials (characterize, don't assume)
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.__head.lookAt(470, 700, 1200));
    await new Promise((r) => setTimeout(r, 1300));
    const v = await page.evaluate(() => window.__head.getValue('eyesLookDown') || 0);
    console.log("gazeDown trial", i, "=", v.toFixed(3));
    await page.evaluate(() => window.__head.lookAt(null, null, 500));
    await new Promise((r) => setTimeout(r, 700));
  }

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

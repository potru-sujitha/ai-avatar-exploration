const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v9.glb", { waitUntil: "domcontentloaded", timeout: 30000 });

  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("=== avatar ready ===");

  // 1. Lip-sync: dense sampling across all 15 visemes during real playback
  await page.click('#play');
  const lipSamples = [];
  const names = ["viseme_aa","viseme_PP","viseme_FF","viseme_TH","viseme_DD","viseme_kk","viseme_CH","viseme_SS","viseme_nn","viseme_RR","viseme_E","viseme_I","viseme_O","viseme_U","viseme_sil"];
  for (let i = 0; i < 20; i++) {
    const vals = await page.evaluate((names) => {
      const h = window.__head;
      return names.map((n) => h.getValue(n) || 0);
    }, names);
    const maxv = Math.max(...vals);
    lipSamples.push(maxv);
    await new Promise((r) => setTimeout(r, 90));
  }
  console.log("LIP-SYNC max-activation samples (90ms step):", lipSamples.map(v => v.toFixed(3)).join(","));
  console.log("LIP-SYNC any nonzero:", lipSamples.some(v => v > 0.1));

  // 2. Blink: 22s window
  const blinkSamples = [];
  const t0 = Date.now();
  while (Date.now() - t0 < 22000) {
    const v = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft') || 0);
    blinkSamples.push(v);
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log("BLINK max over 22s:", Math.max(...blinkSamples).toFixed(3), "nonzero frames:", blinkSamples.filter(v=>v>0.1).length, "/", blinkSamples.length);

  // 3. Gaze: lookAt test
  await page.click('#lookUp');
  await new Promise((r) => setTimeout(r, 1300));
  const gazeUp = await page.evaluate(() => ({ down: window.__head.getValue('eyesLookDown')||0, up: window.__head.getValue('eyesLookUp')||0 }));
  console.log("GAZE after lookUp:", JSON.stringify(gazeUp));
  await page.click('#lookDown');
  await new Promise((r) => setTimeout(r, 1300));
  const gazeDown = await page.evaluate(() => ({ down: window.__head.getValue('eyesLookDown')||0, up: window.__head.getValue('eyesLookUp')||0 }));
  console.log("GAZE after lookDown:", JSON.stringify(gazeDown));
  await page.click('#lookCenter');

  // 4. Moods: happy/sad/fear convergence
  for (const mood of ["happy","sad","fear"]) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise((r) => setTimeout(r, 3000));
    const keys = mood === "happy" ? ["mouthSmile"] : mood === "sad" ? ["mouthFrownLeft"] : ["eyeWideLeft"];
    const vals = await page.evaluate((keys) => keys.map(k => window.__head.getValue(k) || 0), keys);
    console.log("MOOD", mood, keys[0], "=", vals[0].toFixed(3));
  }
  await page.evaluate(() => window.__head.setMood('neutral'));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

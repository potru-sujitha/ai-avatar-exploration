const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v17.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
  console.log("ready:", ready, "| status:", status.replace(/\n/g, ' '));

  // morph target dump
  const morphInfo = await page.evaluate(() => {
    const h = window.__head;
    let mesh = null, visemes = 0, total = 0;
    h.armature.traverse((o) => {
      if (o.morphTargetDictionary) {
        const keys = Object.keys(o.morphTargetDictionary);
        const v = keys.filter(k => k.startsWith('viseme_')).length;
        if (v > visemes) { visemes = v; mesh = o; total = keys.length; }
      }
    });
    return { visemes, total };
  });
  console.log("morph targets:", JSON.stringify(morphInfo));

  // blink, isolated, longer window
  let blinkMax = 0;
  for (let i = 0; i < 100; i++) {
    const v = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft') || 0);
    if (v > blinkMax) blinkMax = v;
    await new Promise((r) => setTimeout(r, 220));
  }
  console.log("blink max over 22s:", blinkMax.toFixed(3));

  // gaze
  await page.evaluate(() => {
    const r = document.getElementById('avatar').getBoundingClientRect();
    window.__head.lookAt(r.left + 10, r.top + r.height/2, 1200);
  });
  await new Promise((r) => setTimeout(r, 1400));
  const gazeVal = await page.evaluate(() => window.__head.getValue('eyeLookOutLeft') || 0);
  console.log("gaze (lookAt left) eyeLookOutLeft:", gazeVal.toFixed(3));
  await page.evaluate(() => window.__head.lookAt(null, null, 500));

  // lip-sync via real detector pipeline
  await page.click('#play').catch(()=>{});
  let lipsyncPeak = 0;
  for (let i = 0; i < 20; i++) {
    const v = await page.evaluate(() => {
      const names = ['viseme_aa','viseme_E','viseme_O','viseme_PP','viseme_kk'];
      return Math.max(...names.map(n => window.__head.getValue(n) || 0));
    });
    if (v > lipsyncPeak) lipsyncPeak = v;
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log("lip-sync peak over 2s playback:", lipsyncPeak.toFixed(3));

  // moods
  const moodResults = {};
  for (const [mood, key, target] of [['happy','mouthSmile',0.2], ['sad','mouthFrownLeft',0.8], ['fear','eyeWideLeft',0.6]]) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise((r) => setTimeout(r, 3000));
    const v = await page.evaluate((k) => window.__head.getValue(k) || 0, key);
    moodResults[mood] = v.toFixed(3);
  }
  await page.evaluate(() => window.__head.setMood('neutral'));
  console.log("mood convergence (3s):", JSON.stringify(moodResults));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

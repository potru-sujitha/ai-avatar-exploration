const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v20_candidate.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
  console.log("ready:", ready, "status:", status.split('\n').join(' | '));

  const morphInfo = await page.evaluate(() => {
    const h = window.__head;
    let visemes = 0, total = 0;
    h.armature.traverse((o) => {
      if (o.morphTargetDictionary) {
        const keys = Object.keys(o.morphTargetDictionary);
        const v = keys.filter(k => k.startsWith('viseme_')).length;
        if (v > visemes) { visemes = v; total = keys.length; }
      }
    });
    return { visemes, total };
  });
  console.log("morphs:", JSON.stringify(morphInfo));

  let blinkMax = 0;
  for (let i = 0; i < 70; i++) {
    const v = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft') || 0);
    if (v > blinkMax) blinkMax = v;
    await new Promise((r) => setTimeout(r, 320));
  }
  console.log("blink max over 22s:", blinkMax.toFixed(3));

  await page.evaluate(() => {
    const r = document.getElementById('avatar').getBoundingClientRect();
    window.__head.lookAt(r.left + 10, r.top + r.height/2, 1200);
  });
  await new Promise((r) => setTimeout(r, 1400));
  const gazeVal = await page.evaluate(() => window.__head.getValue('eyeLookOutLeft') || 0);
  console.log("gaze eyeLookOutLeft:", gazeVal.toFixed(3));
  await page.evaluate(() => window.__head.lookAt(null, null, 500));

  await page.click('#play').catch(()=>{});
  let lipsyncPeak = 0;
  for (let i = 0; i < 25; i++) {
    const v = await page.evaluate(() => {
      const names = ['viseme_aa','viseme_E','viseme_O','viseme_PP','viseme_kk','viseme_RR'];
      return Math.max(...names.map(n => window.__head.getValue(n) || 0));
    });
    if (v > lipsyncPeak) lipsyncPeak = v;
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log("lip-sync peak:", lipsyncPeak.toFixed(3));

  const moodResults = {};
  for (const [mood, key] of [['happy','mouthSmile'], ['sad','mouthFrownLeft'], ['fear','eyeWideLeft']]) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise((r) => setTimeout(r, 9000));
    const v = await page.evaluate((k) => window.__head.getValue(k) || 0, key);
    moodResults[mood] = v.toFixed(3);
  }
  await page.evaluate(() => window.__head.setMood('neutral'));
  console.log("mood convergence (9s):", JSON.stringify(moodResults));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

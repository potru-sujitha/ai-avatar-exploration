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

  // 15/15 visemes + morph count
  const morphs = await page.evaluate(() => {
    const h = window.__head;
    let visemeCount = 0, arkitCount = 0;
    h.armature.traverse((o) => {
      if (o.morphTargetDictionary) {
        const keys = Object.keys(o.morphTargetDictionary);
        const v = keys.filter(k => k.startsWith('viseme_')).length;
        if (v > visemeCount) { visemeCount = v; arkitCount = keys.filter(k => !k.startsWith('viseme_')).length; }
      }
    });
    return { visemeCount, arkitCount };
  });
  console.log("REGRESSION visemes/morphs:", JSON.stringify(morphs));

  // lip-sync
  await page.click('#play');
  await new Promise((r) => setTimeout(r, 1200));
  const lipsyncVals = await page.evaluate(() => {
    const h = window.__head;
    return ["viseme_aa","viseme_O","viseme_E","viseme_PP"].map(n => h.getValue(n));
  });
  console.log("REGRESSION lipsync (mid-speech, should have nonzero):", JSON.stringify(lipsyncVals));
  await new Promise((r) => setTimeout(r, 2500));

  // blink - sample over 15s
  let maxBlink = 0;
  for (let i = 0; i < 30; i++) {
    const b = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft') || 0);
    if (b > maxBlink) maxBlink = b;
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log("REGRESSION blink max over 15s:", maxBlink);

  // gaze
  await page.evaluate(() => { window.__head.lookAt(5, 380, 1500); });
  await new Promise((r) => setTimeout(r, 1800));
  const gaze = await page.evaluate(() => window.__head.getValue('eyeLookOutLeft'));
  console.log("REGRESSION gaze eyeLookOutLeft:", gaze);

  // moods
  for (const mood of ["happy", "sad", "fear", "neutral"]) {
    await page.evaluate((m) => { window.__head.setMood(m); }, mood);
    await new Promise((r) => setTimeout(r, 3000));
    const v = await page.evaluate(() => ({
      mouthSmile: window.__head.getValue('mouthSmile'),
      mouthFrownLeft: window.__head.getValue('mouthFrownLeft'),
      browInnerUp: window.__head.getValue('browInnerUp'),
    }));
    console.log(`REGRESSION mood=${mood}:`, JSON.stringify(v));
  }

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v8.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  // morph target compatibility
  const compat = await page.evaluate(() => {
    const h = window.__head;
    let visemeKeys = [], otherKeys = [];
    h.armature.traverse((o) => {
      if (o.morphTargetDictionary) {
        const keys = Object.keys(o.morphTargetDictionary);
        const v = keys.filter(k => k.startsWith('viseme_'));
        if (v.length > visemeKeys.length) { visemeKeys = v; otherKeys = keys.filter(k => !k.startsWith('viseme_')); }
      }
    });
    return { visemeCount: visemeKeys.length, otherCount: otherKeys.length, hasArmature: !!h.armature };
  });
  console.log("COMPAT:", JSON.stringify(compat));

  // lip-sync: dense sampling across the clip
  await page.evaluate(() => { window.__lipsyncSamples = []; });
  await page.click('#play');
  for (let i = 0; i < 30; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      return [h.getValue('viseme_aa'), h.getValue('viseme_I'), h.getValue('viseme_PP'), h.getValue('viseme_O')];
    });
    await page.evaluate((v) => window.__lipsyncSamples.push(v), v);
    await new Promise((r) => setTimeout(r, 100));
  }
  const lipsync = await page.evaluate(() => window.__lipsyncSamples);
  const maxVals = [0,1,2,3].map(i => Math.max(...lipsync.map(s => s[i] || 0)));
  console.log("LIPSYNC max per channel [aa,I,PP,O]:", JSON.stringify(maxVals));

  // blink: 22s window at 200ms steps
  const blinkSamples = [];
  for (let i = 0; i < 110; i++) {
    const v = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft'));
    blinkSamples.push(v || 0);
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("BLINK max over 22s:", Math.max(...blinkSamples));

  // gaze down (reliable per every prior phase)
  await page.evaluate(() => {
    const r = document.getElementById('avatar').getBoundingClientRect();
    window.__head.lookAt(r.left + r.width/2, r.bottom, 1200);
  });
  await new Promise((r) => setTimeout(r, 1000));
  const gazeDown = await page.evaluate(() => window.__head.getValue('eyeLookDownLeft'));
  console.log("GAZE down:", gazeDown);

  // moods: happy/sad/fear
  const moodResults = {};
  for (const [mood, key] of [["happy","mouthSmile"],["sad","mouthFrownLeft"],["fear","browInnerUp"]]) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise((r) => setTimeout(r, 4000));
    const v = await page.evaluate((k) => window.__head.getValue(k), key);
    moodResults[mood] = v;
  }
  console.log("MOODS:", JSON.stringify(moodResults));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

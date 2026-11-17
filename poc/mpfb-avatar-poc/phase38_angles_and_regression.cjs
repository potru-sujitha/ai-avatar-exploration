const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v18_candidate_v3.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);

  // Front
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: 0.8, cameraY: 0.45, cameraX: 0 }); });
  await new Promise((r) => setTimeout(r, 1400));
  await page.screenshot({ path: "phase38_v3_front.png" });

  // Three-quarter left/right via direct armature rotation (established technique)
  await page.evaluate(() => { window.__head.armature.rotation.y = 0.55; });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase38_v3_threequarter_left.png" });
  await page.evaluate(() => { window.__head.armature.rotation.y = -0.55; });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase38_v3_threequarter_right.png" });
  await page.evaluate(() => { window.__head.armature.rotation.y = 1.4; });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase38_v3_side.png" });
  await page.evaluate(() => { window.__head.armature.rotation.y = 0; });

  // Top (best-effort, established limitation in this investigation)
  await page.evaluate(() => {
    const h = window.__head;
    h.camera.position.set(0, 1.85, 0.25);
    h.camera.lookAt(0, 1.6, 0);
    h.controls.target.set(0, 1.6, 0);
    h.controls.update();
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase38_v3_top.png" });

  // Reset for regression
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: 0.8, cameraY: 0.45, cameraX: 0 }); });

  // Regression: visemes/morphs
  const morphInfo = await page.evaluate(() => {
    const h = window.__head; let visemes = 0, total = 0;
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

  // Blink (22s window)
  let blinkMax = 0;
  for (let i = 0; i < 70; i++) {
    const v = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft') || 0);
    if (v > blinkMax) blinkMax = v;
    await new Promise((r) => setTimeout(r, 320));
  }
  console.log("blink max over 22s:", blinkMax.toFixed(3));

  // Gaze
  await page.evaluate(() => {
    const r = document.getElementById('avatar').getBoundingClientRect();
    window.__head.lookAt(r.left + 10, r.top + r.height/2, 1200);
  });
  await new Promise((r) => setTimeout(r, 1400));
  const gazeVal = await page.evaluate(() => window.__head.getValue('eyeLookOutLeft') || 0);
  console.log("gaze eyeLookOutLeft:", gazeVal.toFixed(3));
  await page.evaluate(() => window.__head.lookAt(null, null, 500));

  // lip-sync
  await page.click('#play').catch(()=>{});
  let lipPeak = 0;
  for (let i = 0; i < 25; i++) {
    const v = await page.evaluate(() => {
      const names = ['viseme_aa','viseme_E','viseme_O','viseme_PP','viseme_kk'];
      return Math.max(...names.map(n => window.__head.getValue(n) || 0));
    });
    if (v > lipPeak) lipPeak = v;
    await new Promise((r) => setTimeout(r, 120));
  }
  console.log("lip-sync peak:", lipPeak.toFixed(3));

  // moods
  const moodResults = {};
  for (const [mood, key] of [['happy','mouthSmile'], ['sad','mouthFrownLeft'], ['fear','eyeWideLeft']]) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise((r) => setTimeout(r, 4000));
    const v = await page.evaluate((k) => window.__head.getValue(k) || 0, key);
    moodResults[mood] = v.toFixed(3);
  }
  console.log("moods:", JSON.stringify(moodResults));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

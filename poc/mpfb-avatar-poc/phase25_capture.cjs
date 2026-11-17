const puppeteer = require("puppeteer");

async function orbitTo(page, angleDeg) {
  // Direct camera-orbit math around head.controls.target, bypassing mouse-drag simulation
  // (the technique Phase 21 developed after Phase 15's mouse-drag approach failed headlessly).
  await page.evaluate((angleDeg) => {
    const h = window.__head;
    const target = h.controls.target;
    const cam = h.camera;
    const offset = cam.position.clone().sub(target);
    const radius = Math.sqrt(offset.x * offset.x + offset.z * offset.z);
    const rad = angleDeg * Math.PI / 180;
    cam.position.x = target.x + radius * Math.sin(rad);
    cam.position.z = target.z + radius * Math.cos(rad);
    cam.lookAt(target);
    h.controls.update();
  }, angleDeg);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v14.glb", { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
  console.log("ready:", ready, "| status:", status);
  console.log("errors so far:", errors.length);
  errors.forEach(e => console.log("  ", e));

  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: "phase25_view1_front.png" });
  console.log("captured front view");

  await orbitTo(page, 35);
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase25_view2_threequarter.png" });
  console.log("captured three-quarter view");

  await orbitTo(page, 85);
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase25_view3_side.png" });
  console.log("captured side view");

  await orbitTo(page, 0); // back to front for the remaining views
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase25_view4_headshoulders.png" }); // same framing as 'front', per the existing demo's head-and-shoulders camera config
  console.log("captured head-and-shoulders view");

  await page.click('#play').catch((e) => errors.push("play click failed: " + e.message));
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: "phase25_view5_midspeech.png" });
  console.log("captured mid-speech view");

  // Animation regression: visemes/morphs count + lip-sync/blink/gaze/mood checks, fresh.
  const morphInfo = await page.evaluate(() => ({ visemes: window.__visemeCount, morphs: window.__arkitCount }));
  console.log("morph counts:", JSON.stringify(morphInfo));

  // Lip-sync: sample a viseme mid-playback (already playing from the click above).
  await new Promise((r) => setTimeout(r, 300));
  const lipVal = await page.evaluate(() => {
    const h = window.__head;
    const names = ["viseme_aa", "viseme_PP", "viseme_O", "viseme_E", "viseme_kk", "viseme_I", "viseme_U", "viseme_SS"];
    return Math.max(...names.map(n => h.getValue(n) || 0));
  });
  console.log("lip-sync peak viseme value:", lipVal);

  // Blink: sample over 20s.
  let maxBlink = 0;
  for (let i = 0; i < 40; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      return Math.max(h.getValue('eyeBlinkLeft') || 0, h.getValue('eyeBlinkRight') || 0);
    });
    if (v > maxBlink) maxBlink = v;
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log("max blink value over 20s:", maxBlink);

  // Gaze.
  await page.click('#lookUp').catch(() => {});
  await new Promise((r) => setTimeout(r, 1300));
  const gazeUp = await page.evaluate(() => window.__head.getValue('eyesLookUp'));
  console.log("gaze up value:", gazeUp);
  await page.click('#lookDown').catch(() => {});
  await new Promise((r) => setTimeout(r, 1300));
  const gazeDown = await page.evaluate(() => window.__head.getValue('eyesLookDown'));
  console.log("gaze down value:", gazeDown);
  await page.click('#lookCenter').catch(() => {});

  // Moods.
  for (const mood of ['happy', 'sad', 'fear', 'neutral']) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise((r) => setTimeout(r, 3000));
    const v = await page.evaluate((m) => {
      const h = window.__head;
      if (m === 'happy') return h.getValue('mouthSmile');
      if (m === 'sad') return h.getValue('mouthFrownLeft');
      if (m === 'fear') return h.getValue('browInnerUp');
      return h.getValue('mouthSmile');
    }, mood);
    console.log(`mood ${mood} ->`, v);
  }

  console.log("total errors:", errors.length);
  errors.forEach(e => console.log("  ", e));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

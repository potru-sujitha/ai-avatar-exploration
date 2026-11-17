const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => { errors.push(e.message); console.log("[pageerror]", e.message); });
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/poc.html?avatar=avatar_v4.glb", { waitUntil: "domcontentloaded", timeout: 30000 });

  let status = "";
  for (let i = 0; i < 60; i++) {
    status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log("LOAD STATUS (v4):", status);
  const loadInfo = await page.evaluate(() => ({ loadTimeMs: window.__loadTimeMs, visemeCount: window.__visemeCount, arkitCount: window.__arkitCount, loadError: window.__loadError }));
  console.log("LOAD INFO:", JSON.stringify(loadInfo));
  if (loadInfo.loadError) { await browser.close(); return; }

  // Front view, neutral
  await page.screenshot({ path: "v4_front_neutral.png" });
  console.log("captured v4_front_neutral.png");

  // Side view (three-quarter) via armature rotation
  await page.evaluate(() => { window.__head.armature.rotation.y = -0.6; });
  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: "v4_side_view.png" });
  console.log("captured v4_side_view.png");
  await page.evaluate(() => { window.__head.armature.rotation.y = 0; });
  await new Promise((r) => setTimeout(r, 200));

  // Close-up (zoom via camera distance if supported, else crop via viewport)
  await page.setViewport({ width: 940, height: 760 });
  await page.evaluate(() => { window.__head.setView && window.__head.setView('head'); });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "v4_closeup.png" });
  console.log("captured v4_closeup.png");
  await page.evaluate(() => { window.__head.setView && window.__head.setView('upper'); });
  await new Promise((r) => setTimeout(r, 300));

  // Lip-sync test (fresh, real detector output via #play button)
  await page.click("#play");
  const visemeSamples = [];
  for (let i = 0; i < 16; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      return Math.max(h.getValue("viseme_aa")||0, h.getValue("viseme_O")||0, h.getValue("viseme_E")||0, h.getValue("viseme_PP")||0);
    });
    visemeSamples.push(v);
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("LIPSYNC viseme samples (v4):", visemeSamples);
  console.log("LIPSYNC works (v4):", visemeSamples.some(v => v > 0.1));

  // Blink test -- 22 second window (Phase 2 found 8s gives false negatives; Phase 4 used 20s)
  await new Promise((r) => setTimeout(r, 1000));
  const blinkSamples = [];
  for (let i = 0; i < 110; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      return Math.max(h.getValue("eyeBlinkLeft")||0, h.getValue("eyeBlinkRight")||0);
    });
    blinkSamples.push(v);
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("BLINK max value (v4, 22s window):", Math.max(...blinkSamples));
  console.log("BLINK works (v4):", Math.max(...blinkSamples) > 0.5);

  // Gaze test
  await page.evaluate(() => { window.__head.lookAt(5, 380, 1500); });
  await new Promise((r) => setTimeout(r, 1000));
  const gaze = await page.evaluate(() => ({ eyeLookOutLeft: window.__head.getValue("eyeLookOutLeft"), eyeLookInRight: window.__head.getValue("eyeLookInRight") }));
  console.log("GAZE (v4):", JSON.stringify(gaze));
  console.log("GAZE works (v4):", (gaze.eyeLookOutLeft||0) > 0.1);

  // Mood test -- fresh, all states, report exactly what's measured
  const moodChecks = {
    neutral: ["eyesLookDown"],
    happy: ["mouthSmile", "eyesLookDown"],
    sad: ["mouthFrownLeft", "browInnerUp"],
    angry: ["browDownLeft", "mouthFrownLeft"],
  };
  const moods = {};
  for (const [mood, keys] of Object.entries(moodChecks)) {
    await page.evaluate((m) => { window.__head.setMood(m); }, mood);
    await new Promise((r) => setTimeout(r, 2500));
    moods[mood] = await page.evaluate((ks) => {
      const h = window.__head;
      return Object.fromEntries(ks.map((k) => [k, h.getValue(k)]));
    }, keys);
  }
  console.log("MOOD samples (v4, fresh):", JSON.stringify(moods, null, 1));

  // reset mood to neutral, take final screenshot
  await page.evaluate(() => { window.__head.setMood("neutral"); });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: "v4_front_final.png" });
  console.log("captured v4_front_final.png");

  console.log("PAGE ERRORS:", errors.length);
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

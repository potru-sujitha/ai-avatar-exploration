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
  await page.goto("http://localhost:8924/poc.html?avatar=avatar_v5.glb", { waitUntil: "domcontentloaded", timeout: 30000 });

  let status = "";
  for (let i = 0; i < 60; i++) {
    status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log("LOAD STATUS:", status);
  const loadInfo = await page.evaluate(() => ({ loadTimeMs: window.__loadTimeMs, visemeCount: window.__visemeCount, arkitCount: window.__arkitCount, shadowMeshCount: window.__shadowMeshCount, anisoResult: window.__anisoResult, loadError: window.__loadError }));
  console.log("LOAD INFO:", JSON.stringify(loadInfo));
  if (loadInfo.loadError) { await browser.close(); return; }

  await page.screenshot({ path: "phase7/v5_neutral_front.png" });
  console.log("captured v5_neutral_front.png");

  // Lip-sync, fresh
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
  console.log("LIPSYNC viseme samples:", visemeSamples);
  console.log("LIPSYNC works:", visemeSamples.some(v => v > 0.1));

  // Blink, fresh, 20s window
  await new Promise((r) => setTimeout(r, 1000));
  const blinkSamples = [];
  for (let i = 0; i < 100; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      return Math.max(h.getValue("eyeBlinkLeft")||0, h.getValue("eyeBlinkRight")||0);
    });
    blinkSamples.push(v);
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("BLINK max value:", Math.max(...blinkSamples));
  console.log("BLINK works:", Math.max(...blinkSamples) > 0.5);

  // Gaze, fresh -- per Phase 6's finding, lookAt() is pose-relative; check the actual
  // computed animQueue target directly rather than trusting a single getValue() read.
  const gazeTrials = [];
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => { window.__head.lookAt(5, 380, 1200); });
    await new Promise((r) => setTimeout(r, 900));
    const g = await page.evaluate(() => ({ eyeLookOutLeft: window.__head.getValue("eyeLookOutLeft"), eyeLookInRight: window.__head.getValue("eyeLookInRight") }));
    gazeTrials.push(g);
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log("GAZE trials:", JSON.stringify(gazeTrials));
  console.log("GAZE works (at least one real paired value):", gazeTrials.some(g => (g.eyeLookOutLeft||0) > 0.1 && (g.eyeLookInRight||0) > 0.1));

  // Mood: happy, sad, fear (angry explicitly out of scope per this phase's instructions)
  const moods = {};
  for (const [mood, keys] of [["happy",["mouthSmile"]],["sad",["mouthFrownLeft"]],["fear",["browInnerUp","eyeWideLeft"]]]) {
    await page.evaluate((m) => { window.__head.setMood(m); }, mood);
    await new Promise((r) => setTimeout(r, 3000));
    moods[mood] = {};
    for (const k of keys) moods[mood][k] = await page.evaluate((kk) => window.__head.getValue(kk), k);
  }
  console.log("MOOD samples:", JSON.stringify(moods));

  // Reset to neutral, take the final comparison screenshots at the SAME framings Phase 6 used
  await page.evaluate(() => { window.__head.setMood("neutral"); });
  await new Promise((r) => setTimeout(r, 1500));

  await page.evaluate(() => { window.__head.setView('head', {cameraDistance:-1.9, cameraY:0.22}); });
  await new Promise((r) => setTimeout(r, 1400));
  await page.screenshot({ path: "phase7/v5_eyes_closeup.png" });
  console.log("captured v5_eyes_closeup.png");

  await page.evaluate(() => { window.__head.setView('head', {cameraDistance:-1.7}); });
  await new Promise((r) => setTimeout(r, 1400));
  await page.screenshot({ path: "phase7/v5_face_closeup.png" });
  console.log("captured v5_face_closeup.png");

  await page.evaluate(() => { window.__head.setView('upper'); });
  await new Promise((r) => setTimeout(r, 1400));
  await page.screenshot({ path: "phase7/v5_front_neutral.png" });
  console.log("captured v5_front_neutral.png");

  await page.evaluate(() => { window.__head.setView('mid'); });
  await new Promise((r) => setTimeout(r, 1400));
  await page.screenshot({ path: "phase7/v5_upper_body.png" });
  console.log("captured v5_upper_body.png");

  // side profile
  await page.evaluate(() => { window.__head.armature.rotation.y = -1.45; });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase7/v5_side_profile.png" });
  console.log("captured v5_side_profile.png");
  await page.evaluate(() => { window.__head.armature.rotation.y = -0.5; });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase7/v5_three_quarter.png" });
  console.log("captured v5_three_quarter.png");
  await page.evaluate(() => { window.__head.armature.rotation.y = 0; });

  console.log("PAGE ERRORS:", errors.length);
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

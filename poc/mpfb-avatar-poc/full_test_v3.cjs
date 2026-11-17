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
  await page.goto("http://localhost:8924/poc.html?avatar=avatar_v3.glb", { waitUntil: "domcontentloaded", timeout: 30000 });

  let status = "";
  for (let i = 0; i < 60; i++) {
    status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log("LOAD STATUS:", status);
  const loadInfo = await page.evaluate(() => ({ loadTimeMs: window.__loadTimeMs, visemeCount: window.__visemeCount, arkitCount: window.__arkitCount, shadowMeshCount: window.__shadowMeshCount, loadError: window.__loadError }));
  console.log("LOAD INFO:", JSON.stringify(loadInfo));

  if (loadInfo.loadError) { await browser.close(); return; }

  await page.screenshot({ path: "v3_neutral_front.png" });
  console.log("captured neutral_front.png");

  // Lip-sync test
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

  // Blink test (separate idle period) -- 20s window, not 8s: Phase 2 found an 8s window
  // can give a false negative (blink rate is irregular enough that a short sample can miss it).
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

  // Gaze test
  await page.evaluate(() => { window.__head.lookAt(5, 380, 1500); });
  await new Promise((r) => setTimeout(r, 1000));
  const gaze = await page.evaluate(() => ({ eyeLookOutLeft: window.__head.getValue("eyeLookOutLeft"), eyeLookInRight: window.__head.getValue("eyeLookInRight") }));
  console.log("GAZE:", JSON.stringify(gaze));
  console.log("GAZE works:", (gaze.eyeLookOutLeft||0) > 0.1);

  // Mood test
  const moods = {};
  for (const [mood, key] of [["happy","mouthSmile"],["sad","mouthFrownLeft"],["angry","browDownLeft"]]) {
    await page.evaluate((m) => { window.__head.setMood(m); }, mood);
    await new Promise((r) => setTimeout(r, 2500));
    moods[mood] = await page.evaluate((k) => window.__head.getValue(k), key);
  }
  console.log("MOOD samples:", JSON.stringify(moods));

  // reset mood to neutral, take a nice screenshot
  await page.evaluate(() => { window.__head.setMood("neutral"); });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: "v3_neutral_final.png" });
  console.log("captured neutral_final.png");

  console.log("PAGE ERRORS:", errors.length);
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

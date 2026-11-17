const puppeteer = require("puppeteer");
const fs = require("fs");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v17.glb", {
    waitUntil: "domcontentloaded", timeout: 30000,
  });

  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await sleep(200);
  }
  const status0 = await page.evaluate(() => document.getElementById("status")?.textContent || "NO STATUS");
  console.log("ready:", ready, "|", status0.replace(/\n/g, " "));

  // === Item 2: fresh screenshots of all 7 moods ===
  const moods = ["neutral", "happy", "sad", "fear", "angry", "disgust", "love"];
  for (const m of moods) {
    await page.evaluate((mood) => window.__head.setMood(mood), m);
    await sleep(9500); // established ~9s convergence window
    await page.screenshot({ path: `phase36_mood_${m}.png` });
    console.log("captured mood:", m);
  }
  await page.evaluate(() => window.__head.setMood("neutral"));
  await sleep(2000);

  // === Item 4: 35s continuous IDLE demonstration, sampled ===
  console.log("--- starting idle window ---");
  const idleSamples = [];
  const idleShots = [];
  const idleStart = Date.now();
  while (Date.now() - idleStart < 35000) {
    const v = await page.evaluate(() => ({
      t: performance.now(),
      y: window.__head.getValue("bodyRotateY") || 0,
      x: window.__head.getValue("bodyRotateX") || 0,
      z: window.__head.getValue("bodyRotateZ") || 0,
      blinkL: window.__head.getValue("eyeBlinkLeft") || 0,
    }));
    idleSamples.push(v);
    const elapsed = Date.now() - idleStart;
    if (elapsed === 0 || Math.floor(elapsed / 10000) !== Math.floor((elapsed - 350) / 10000)) {
      const fname = `phase36_idle_t${Math.round(elapsed / 1000)}s.png`;
      await page.screenshot({ path: fname });
      idleShots.push(fname);
    }
    await sleep(350);
  }
  const idleY = idleSamples.map((s) => s.y);
  const idleX = idleSamples.map((s) => s.x);
  const idleZ = idleSamples.map((s) => s.z);
  const idleBlinkMax = Math.max(...idleSamples.map((s) => s.blinkL));
  const stats = (arr) => ({
    min: Math.min(...arr), max: Math.max(...arr),
    mean: arr.reduce((a, b) => a + b, 0) / arr.length,
  });
  const idleStatsY = stats(idleY), idleStatsX = stats(idleX), idleStatsZ = stats(idleZ);
  console.log("IDLE window: " + idleSamples.length + " samples over 35s");
  console.log("  bodyRotateY (yaw)  min/max/mean (rad):", idleStatsY.min.toFixed(4), idleStatsY.max.toFixed(4), idleStatsY.mean.toFixed(4));
  console.log("  bodyRotateY (yaw)  min/max (deg):", (idleStatsY.min * 180 / Math.PI).toFixed(2), (idleStatsY.max * 180 / Math.PI).toFixed(2));
  console.log("  bodyRotateX (pitch) min/max/mean (rad):", idleStatsX.min.toFixed(4), idleStatsX.max.toFixed(4), idleStatsX.mean.toFixed(4));
  console.log("  bodyRotateZ (roll)  min/max/mean (rad):", idleStatsZ.min.toFixed(4), idleStatsZ.max.toFixed(4), idleStatsZ.mean.toFixed(4));
  console.log("  idle window blink max:", idleBlinkMax.toFixed(3));
  console.log("  idle screenshots:", idleShots.join(", "));

  // === Item 6: gaze independence check, mid idle-equivalent ===
  console.log("--- gaze independence check ---");
  const beforeGaze = await page.evaluate(() => ({
    y: window.__head.getValue("bodyRotateY") || 0,
    gaze: window.__head.getValue("eyeLookOutLeft") || 0,
  }));
  await page.evaluate(() => {
    const r = document.getElementById("avatar").getBoundingClientRect();
    window.__head.lookAt(r.left + 15, r.top + r.height / 2, 1000);
  });
  await sleep(1300);
  const afterGaze = await page.evaluate(() => ({
    y: window.__head.getValue("bodyRotateY") || 0,
    gaze: window.__head.getValue("eyeLookOutLeft") || 0,
  }));
  console.log("gaze check: before bodyRotateY=" + beforeGaze.y.toFixed(4) + " gaze=" + beforeGaze.gaze.toFixed(3));
  console.log("gaze check: after  bodyRotateY=" + afterGaze.y.toFixed(4) + " gaze=" + afterGaze.gaze.toFixed(3));
  await page.evaluate(() => window.__head.lookAt(null, null, 500));
  await sleep(700);

  // === Item 3: 35s continuous SPEAKING demonstration (looped real playback) ===
  console.log("--- starting speaking window ---");
  const speakSamples = [];
  const speakShots = [];
  const speakStart = Date.now();
  let cyclesStarted = 0;
  while (Date.now() - speakStart < 35000) {
    // re-trigger playback whenever it's not currently active
    const playing = await page.evaluate(() => window.__head.isAudioPlaying === true || window.__head.isSpeaking === true);
    if (!playing) {
      await page.click("#play").catch(() => {});
      cyclesStarted++;
    }
    const v = await page.evaluate(() => ({
      t: performance.now(),
      y: window.__head.getValue("bodyRotateY") || 0,
      x: window.__head.getValue("bodyRotateX") || 0,
      z: window.__head.getValue("bodyRotateZ") || 0,
      aa: window.__head.getValue("viseme_aa") || 0,
      O: window.__head.getValue("viseme_O") || 0,
      E: window.__head.getValue("viseme_E") || 0,
      blinkL: window.__head.getValue("eyeBlinkLeft") || 0,
    }));
    speakSamples.push(v);
    const elapsed = Date.now() - speakStart;
    if (elapsed === 0 || Math.floor(elapsed / 10000) !== Math.floor((elapsed - 250) / 10000)) {
      const fname = `phase36_speaking_t${Math.round(elapsed / 1000)}s.png`;
      await page.screenshot({ path: fname });
      speakShots.push(fname);
    }
    await sleep(250);
  }
  const speakY = speakSamples.map((s) => s.y);
  const speakX = speakSamples.map((s) => s.x);
  const speakZ = speakSamples.map((s) => s.z);
  const visemePeak = Math.max(...speakSamples.map((s) => Math.max(s.aa, s.O, s.E)));
  const speakBlinkMax = Math.max(...speakSamples.map((s) => s.blinkL));
  const speakStatsY = stats(speakY), speakStatsX = stats(speakX), speakStatsZ = stats(speakZ);
  console.log("SPEAKING window: " + speakSamples.length + " samples over 35s, " + cyclesStarted + " playback cycles triggered");
  console.log("  bodyRotateY (yaw)  min/max/mean (rad):", speakStatsY.min.toFixed(4), speakStatsY.max.toFixed(4), speakStatsY.mean.toFixed(4));
  console.log("  bodyRotateY (yaw)  min/max (deg):", (speakStatsY.min * 180 / Math.PI).toFixed(2), (speakStatsY.max * 180 / Math.PI).toFixed(2));
  console.log("  bodyRotateX (pitch) min/max/mean (rad):", speakStatsX.min.toFixed(4), speakStatsX.max.toFixed(4), speakStatsX.mean.toFixed(4));
  console.log("  bodyRotateZ (roll)  min/max/mean (rad):", speakStatsZ.min.toFixed(4), speakStatsZ.max.toFixed(4), speakStatsZ.mean.toFixed(4));
  console.log("  viseme peak during window:", visemePeak.toFixed(3));
  console.log("  speaking window blink max:", speakBlinkMax.toFixed(3));
  console.log("  speaking screenshots:", speakShots.join(", "));

  fs.writeFileSync("phase36_raw_data.json", JSON.stringify({ idleSamples, speakSamples, beforeGaze, afterGaze }, null, 1));
  console.log("wrote phase36_raw_data.json");

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

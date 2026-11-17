const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/poc.html?avatar=avatar_v4.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  // Better-centered mouth close-up (less negative cameraY to compensate for the head's own downward tilt)
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: -1.65, cameraY: -0.08 }); });
  await new Promise((r) => setTimeout(r, 1300));
  await page.screenshot({ path: "phase6_07c_mouth_closeup_recentered.png" });
  console.log("captured mouth recentered (closed)");

  // Trigger REAL playback (proven streamAudio pipeline) and capture a genuine open-mouth frame
  await page.click("#play");
  let captured = false;
  for (let i = 0; i < 60; i++) {
    const maxVal = await page.evaluate(() => {
      const h = window.__head;
      const names = ["viseme_aa","viseme_PP","viseme_O","viseme_E","viseme_kk","viseme_I","viseme_U"];
      return Math.max(...names.map((n) => h.getValue(n) || 0));
    });
    if (maxVal > 0.3 && !captured) {
      await page.screenshot({ path: "phase6_07d_mouth_closeup_speaking.png" });
      console.log("captured mouth mid-speech at maxVal =", maxVal);
      captured = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 60));
  }
  if (!captured) console.log("never caught a high viseme value for the open-mouth shot");

  await new Promise((r) => setTimeout(r, 1500)); // let playback finish
  await page.evaluate(() => { window.__head.setView('upper'); });
  await new Promise((r) => setTimeout(r, 1300));

  // Full mood sweep -- every state defined in animMoods, not just the 3 tested before
  const moodNames = await page.evaluate(() => window.__head.getMoodNames());
  console.log("ALL MOOD NAMES:", JSON.stringify(moodNames));

  const moodKeys = {
    neutral: ["eyesLookDown"],
    happy: ["mouthSmile", "eyesLookDown"],
    sad: ["mouthFrownLeft", "browInnerUp"],
    angry: ["browDownLeft", "mouthFrownLeft", "jawForward"],
    fear: ["browInnerUp", "eyeWideLeft", "mouthFunnel"],
  };
  const moodResults = {};
  for (const mood of moodNames) {
    await page.evaluate((m) => { window.__head.setMood(m); }, mood);
    await new Promise((r) => setTimeout(r, 3000)); // long settle time, exponential smoothing per source
    const keys = moodKeys[mood] || [];
    const vals = await page.evaluate((keys) => {
      const h = window.__head;
      return Object.fromEntries(keys.map((k) => [k, h.getValue(k)]));
    }, keys);
    moodResults[mood] = vals;
    if (mood === "happy" || mood === "sad" || mood === "angry") {
      await page.screenshot({ path: `phase6_mood_${mood}.png` });
    }
  }
  console.log("FULL MOOD RESULTS:", JSON.stringify(moodResults, null, 1));

  await page.evaluate(() => { window.__head.setMood("neutral"); });
  await new Promise((r) => setTimeout(r, 2000));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8923/poc2.html", { waitUntil: "domcontentloaded", timeout: 30000 });

  for (let i = 0; i < 40; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  // --- Gaze test: look at a far-left, far-up screen point, sample real eye-direction morphs ---
  const gazeKeys = ["eyeLookOutLeft", "eyeLookInLeft", "eyeLookOutRight", "eyeLookInRight", "eyesLookDown", "eyesLookUp"];
  const before = await page.evaluate((keys) => {
    const h = window.__head;
    return Object.fromEntries(keys.map((k) => [k, h.getValue(k)]));
  }, gazeKeys);
  await page.evaluate(() => { window.__head.lookAt(50, 50, 1500); });
  await new Promise((r) => setTimeout(r, 800));
  const during = await page.evaluate((keys) => {
    const h = window.__head;
    return Object.fromEntries(keys.map((k) => [k, h.getValue(k)]));
  }, gazeKeys);
  console.log("gaze before lookAt:", JSON.stringify(before));
  console.log("gaze during lookAt (target top-left of screen):", JSON.stringify(during));
  const gazeChanged = gazeKeys.some((k) => before[k] !== during[k]);
  console.log("gaze changed:", gazeChanged);

  // --- Mood test: switch mood, sample each mood's OWN documented baseline keys (per source, animMoods table) ---
  const moodChecks = {
    neutral: ["eyesLookDown"],
    happy: ["mouthSmile", "eyesLookDown"],
    sad: ["mouthFrownLeft", "browInnerUp"],
    angry: ["browDownLeft", "mouthFrownLeft"],
  };
  const moodSamples = {};
  for (const [mood, keys] of Object.entries(moodChecks)) {
    await page.evaluate((m) => { window.__head.setMood(m); }, mood);
    await new Promise((r) => setTimeout(r, 2500));
    const v = await page.evaluate((keys) => {
      const h = window.__head;
      return Object.fromEntries(keys.map((k) => [k, h.getValue(k)]));
    }, keys);
    moodSamples[mood] = v;
  }
  console.log("mood samples (each mood's own baseline keys):", JSON.stringify(moodSamples, null, 1));

  await page.screenshot({ path: "mood_angry.png" });

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

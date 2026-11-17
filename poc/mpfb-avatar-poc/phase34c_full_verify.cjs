const puppeteer = require("puppeteer");

const MOODS = ["neutral", "happy", "sad", "fear", "angry", "disgust", "love"];
const rad2deg = (r) => r * 180 / Math.PI;

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v17.glb", { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log("ready:", ready);

  const idleResults = {};
  for (const mood of MOODS) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise((r) => setTimeout(r, 1500)); // let any previous mood's targets clear
    let minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < 50; i++) {
      const y = await page.evaluate(() => window.__head.getValue('bodyRotateY') || 0);
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      await new Promise((r) => setTimeout(r, 300));
    }
    idleResults[mood] = { minDeg: rad2deg(minY).toFixed(1), maxDeg: rad2deg(maxY).toFixed(1) };
    console.log(`idle [${mood}] bodyRotateY: ${idleResults[mood].minDeg} to ${idleResults[mood].maxDeg} deg (15s/50 samples)`);
  }

  // Speaking-transition check for happy and fear (the two most relevant per Phase 34b)
  const [tlRes, wavRes] = await Promise.all([page.evaluate(() => fetch('./timeline.json').then(r=>r.json())), null]);
  for (const mood of ["happy", "fear"]) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise((r) => setTimeout(r, 4000)); // let idle settle toward an arbitrary point
    await page.click('#play').catch(() => {});
    let minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < 16; i++) {
      const y = await page.evaluate(() => window.__head.getValue('bodyRotateY') || 0);
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      await new Promise((r) => setTimeout(r, 150));
    }
    console.log(`speaking-transition [${mood}] bodyRotateY: ${rad2deg(minY).toFixed(1)} to ${rad2deg(maxY).toFixed(1)} deg (first ~2.4s of speech)`);
    await page.evaluate(() => window.__head.streamStop && window.__head.streamStop());
    await new Promise((r) => setTimeout(r, 500));
  }

  // Regression: gaze, lip-sync, blink
  await page.evaluate(() => window.__head.setMood('neutral'));
  await new Promise((r) => setTimeout(r, 1500));

  const beforeY = await page.evaluate(() => window.__head.getValue('bodyRotateY') || 0);
  await page.evaluate(() => {
    const r = document.getElementById('avatar').getBoundingClientRect();
    window.__head.lookAt(r.left + 10, r.top + r.height/2, 1200);
  });
  await new Promise((r) => setTimeout(r, 1400));
  const gazeVal = await page.evaluate(() => window.__head.getValue('eyeLookOutLeft') || 0);
  const afterY = await page.evaluate(() => window.__head.getValue('bodyRotateY') || 0);
  console.log(`gaze regression: eyeLookOutLeft=${gazeVal.toFixed(3)} | bodyRotateY before=${rad2deg(beforeY).toFixed(2)}deg after=${rad2deg(afterY).toFixed(2)}deg (gaze must not drive head rotation)`);
  await page.evaluate(() => window.__head.lookAt(null, null, 500));
  await new Promise((r) => setTimeout(r, 600));

  await page.click('#play').catch(() => {});
  let lipsyncPeak = 0;
  for (let i = 0; i < 20; i++) {
    const v = await page.evaluate(() => {
      const names = ['viseme_aa','viseme_E','viseme_O','viseme_PP','viseme_kk'];
      return Math.max(...names.map(n => window.__head.getValue(n) || 0));
    });
    if (v > lipsyncPeak) lipsyncPeak = v;
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log("lip-sync peak over 2s playback:", lipsyncPeak.toFixed(3));

  let blinkMax = 0;
  for (let i = 0; i < 90; i++) {
    const v = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft') || 0);
    if (v > blinkMax) blinkMax = v;
    await new Promise((r) => setTimeout(r, 240));
  }
  console.log("blink max over ~22s:", blinkMax.toFixed(3));

  // Expression baseline regression (spot-check happy/sad/fear's non-head baselines still converge)
  const exprResults = {};
  for (const [mood, key] of [["happy", "mouthSmile"], ["sad", "mouthFrownLeft"], ["fear", "eyeWideLeft"]]) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise((r) => setTimeout(r, 4000));
    const v = await page.evaluate((k) => window.__head.getValue(k) || 0, key);
    exprResults[mood] = v.toFixed(3);
  }
  console.log("expression baseline convergence (4s):", JSON.stringify(exprResults));

  // Screenshots
  await page.evaluate(() => window.__head.setMood('neutral'));
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: "phase34c_neutral_front.png" });

  await page.click('#play').catch(() => {});
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: "phase34c_speaking.png" });

  for (const mood of ["happy", "sad", "fear"]) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise((r) => setTimeout(r, 2500));
    await page.screenshot({ path: `phase34c_${mood}.png` });
  }

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

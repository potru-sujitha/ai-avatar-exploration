const puppeteer = require("puppeteer");

async function measureMood(page, mood, durationS) {
  if (mood !== 'neutral') await page.evaluate((m) => window.__head.setMood(m), mood);
  const samples = { x: [], y: [], z: [] };
  const n = Math.floor(durationS * 1000 / 400);
  for (let i = 0; i < n; i++) {
    const v = await page.evaluate(() => ({
      x: window.__head.getValue('bodyRotateX') || 0,
      y: window.__head.getValue('bodyRotateY') || 0,
      z: window.__head.getValue('bodyRotateZ') || 0,
    }));
    samples.x.push(v.x); samples.y.push(v.y); samples.z.push(v.z);
    await new Promise((r) => setTimeout(r, 400));
  }
  const stats = (arr) => {
    const deg = arr.map((r) => r * 180 / Math.PI);
    const min = Math.min(...deg), max = Math.max(...deg);
    const mean = deg.reduce((a, b) => a + b, 0) / deg.length;
    return { min: min.toFixed(2), max: max.toFixed(2), mean: mean.toFixed(2), n: deg.length };
  };
  return { mood, yaw: stats(samples.y), pitch: stats(samples.x), roll: stats(samples.z) };
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v17.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);

  const results = [];
  for (const mood of ['neutral', 'happy', 'sad', 'fear']) {
    console.log(`measuring ${mood} for 50s...`);
    const r = await measureMood(page, mood, 50);
    console.log(JSON.stringify(r));
    results.push(r);
  }

  // gaze independence check during an actual mood switch + extended window
  await page.evaluate(() => window.__head.setMood('happy'));
  await new Promise((r) => setTimeout(r, 1000));
  const beforeHeadY = await page.evaluate(() => window.__head.getValue('headRotateY') || 0);
  await page.evaluate(() => {
    const r = document.getElementById('avatar').getBoundingClientRect();
    window.__head.lookAt(r.left + r.width * 0.5, r.top + r.height * 0.3, 1000);
  });
  await new Promise((r) => setTimeout(r, 1200));
  const afterHeadY = await page.evaluate(() => window.__head.getValue('headRotateY') || 0);
  const gazeVal = await page.evaluate(() => window.__head.getValue('eyeLookOutLeft') || 0);
  console.log("gaze/head independence during happy mood + lookAt: headRotateY before=" + (beforeHeadY*180/Math.PI).toFixed(3) + "deg after=" + (afterHeadY*180/Math.PI).toFixed(3) + "deg, gaze morph eyeLookOutLeft=" + gazeVal.toFixed(3));

  await page.evaluate(() => window.__head.setMood('neutral'));

  // regression: lip-sync, blink, happy convergence
  await page.click('#play').catch(()=>{});
  let lipsyncPeak = 0;
  for (let i = 0; i < 20; i++) {
    const v = await page.evaluate(() => {
      const names = ['viseme_aa','viseme_E','viseme_O','viseme_PP','viseme_kk'];
      return Math.max(...names.map(n => window.__head.getValue(n) || 0));
    });
    if (v > lipsyncPeak) lipsyncPeak = v;
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log("lip-sync peak:", lipsyncPeak.toFixed(3));

  let blinkMax = 0;
  for (let i = 0; i < 60; i++) {
    const v = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft') || 0);
    if (v > blinkMax) blinkMax = v;
    await new Promise((r) => setTimeout(r, 400));
  }
  console.log("blink max over 24s:", blinkMax.toFixed(3));

  await page.screenshot({ path: "phase35_neutral_front.png" });
  for (const mood of ['happy','sad','fear']) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise((r) => setTimeout(r, 4000));
    await page.screenshot({ path: `phase35_${mood}.png` });
  }
  await page.evaluate(() => window.__head.setMood('neutral'));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

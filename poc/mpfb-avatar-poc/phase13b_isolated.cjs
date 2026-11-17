const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto(`http://localhost:8924/phase13-demo.html?avatar=./avatar_v7.glb&cb2=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 50; i++) {
    if (await page.evaluate(() => window.__ready === true)) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  // Isolated lip-sync check: sample densely across the whole clip duration, take the max per viseme.
  await page.click('#play');
  const names = ["viseme_aa","viseme_PP","viseme_O","viseme_E","viseme_I","viseme_U","viseme_kk","viseme_SS"];
  const maxVals = Object.fromEntries(names.map(n => [n, 0]));
  for (let i = 0; i < 30; i++) {
    const vals = await page.evaluate((ns) => ns.map(n => window.__head.getValue(n)), names);
    names.forEach((n, idx) => { if (vals[idx] > maxVals[n]) maxVals[n] = vals[idx]; });
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log("ISOLATED lip-sync max values over dense 3s sampling:", JSON.stringify(maxVals));

  // Isolated blink check: fresh load state, sample tightly (200ms) over 22s to actually catch the ~200ms full-closure window.
  const blinkVals = [];
  for (let i = 0; i < 110; i++) {
    blinkVals.push(await page.evaluate(() => window.__head.getValue("eyeBlinkLeft")));
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ISOLATED blink max over 22s (200ms steps):", Math.max(...blinkVals.map(v => v||0)));

  // Isolated gaze-up re-check (a few fresh attempts, since Phase 6 found single lookAt(up) calls can land near-zero depending on idle-animation phase)
  const gazeUpTrials = [];
  for (let i = 0; i < 4; i++) {
    const r = await page.evaluate(() => document.getElementById('avatar').getBoundingClientRect());
    await page.evaluate((rect) => window.__head.lookAt(rect.left + rect.width/2, rect.top, 1200), r);
    await new Promise((res) => setTimeout(res, 1400));
    gazeUpTrials.push(await page.evaluate(() => window.__head.getValue("eyesLookUp")));
    await page.evaluate(() => window.__head.lookAt(null, null, 500));
    await new Promise((res) => setTimeout(res, 700));
  }
  console.log("ISOLATED gaze-up trials:", JSON.stringify(gazeUpTrials));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ width: 900, height: 720 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v6.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => window.__ready === true)) break; await new Promise((r) => setTimeout(r, 300)); }

  const counts = await page.evaluate(() => ({ visemes: window.__visemeCount, arkit: window.__arkitCount }));
  console.log("RESULT visemeCount:", counts.visemes, "(expect 15)");
  console.log("RESULT arkitCount:", counts.arkit, "(expect >=52, includes TalkingHead internal composites)");

  // Lip-sync
  await page.click('#play');
  const lipSamples = [];
  for (let i = 0; i < 10; i++) {
    lipSamples.push(await page.evaluate(() => window.__head.getValue('viseme_aa')));
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log("RESULT lipsync viseme_aa samples:", JSON.stringify(lipSamples));
  await new Promise((r) => setTimeout(r, 1500));
  await page.click('#stop');

  // Blink over 22s
  const blinkSamples = [];
  for (let i = 0; i < 44; i++) {
    blinkSamples.push(await page.evaluate(() => window.__head.getValue('eyeBlinkLeft')));
    await new Promise((r) => setTimeout(r, 500));
  }
  const maxBlink = Math.max(...blinkSamples.map(v => v || 0));
  console.log("RESULT blink max over 22s:", maxBlink, "(expect ~1.0)");

  // Gaze: up and down
  await page.evaluate(() => { const r = document.getElementById('avatar').getBoundingClientRect(); window.__head.lookAt(r.left + r.width/2, r.top, 1200); });
  await new Promise((r) => setTimeout(r, 1300));
  const up = await page.evaluate(() => window.__head.getValue('eyesLookUp'));
  await page.evaluate(() => { const r = document.getElementById('avatar').getBoundingClientRect(); window.__head.lookAt(r.left + r.width/2, r.bottom, 1200); });
  await new Promise((r) => setTimeout(r, 1300));
  const down = await page.evaluate(() => window.__head.getValue('eyesLookDown'));
  console.log("RESULT gaze eyesLookUp:", up, "eyesLookDown:", down);
  await page.evaluate(() => window.__head.lookAt(null, null, 500));

  // Moods
  const moods = {};
  for (const [mood, key] of [["happy", "mouthSmile"], ["sad", "mouthFrownLeft"], ["fear", "eyeWideLeft"]]) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise((r) => setTimeout(r, 3000));
    moods[mood] = await page.evaluate((k) => window.__head.getValue(k), key);
  }
  await page.evaluate(() => window.__head.setMood('neutral'));
  console.log("RESULT moods (happy/sad/fear):", JSON.stringify(moods));

  await page.screenshot({ path: "phase13_v6_final.png" });
  console.log("RESULT errors captured:", errors.length, errors.join(" | "));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

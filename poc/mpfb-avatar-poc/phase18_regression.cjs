const puppeteer = require("puppeteer");

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase18-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);

  // Lip-sync: dense sampling across playback
  if (page.$('#play')) {}
  await page.evaluate(() => { if (window.__head.audioCtx.state === 'suspended') window.__head.audioCtx.resume(); });
  await page.click('#play');
  const lipSamples = [];
  for (let i = 0; i < 20; i++) {
    const v = await page.evaluate(() => window.__head.getValue('viseme_aa') || 0);
    lipSamples.push(v);
    await new Promise(r => setTimeout(r, 150));
  }
  console.log("lip-sync samples (viseme_aa):", lipSamples.map(v=>v.toFixed(3)).join(","));
  console.log("lip-sync max:", Math.max(...lipSamples).toFixed(3));

  // Blink over 20s
  const blinkSamples = [];
  for (let i = 0; i < 20; i++) {
    const v = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft') || 0);
    blinkSamples.push(v);
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log("blink max over 20s:", Math.max(...blinkSamples).toFixed(3));

  // Gaze down
  await page.evaluate(() => {
    const r = document.getElementById('avatar').getBoundingClientRect();
    window.__head.lookAt(r.left + r.width/2, r.bottom, 1200);
  });
  await new Promise(r => setTimeout(r, 1300));
  const gazeDown = await page.evaluate(() => window.__head.getValue('eyesLookDown'));
  console.log("gaze down:", gazeDown.toFixed(3));

  // Gaze up
  await page.evaluate(() => {
    const r = document.getElementById('avatar').getBoundingClientRect();
    window.__head.lookAt(r.left + r.width/2, r.top, 1200);
  });
  await new Promise(r => setTimeout(r, 1300));
  const gazeUp = await page.evaluate(() => window.__head.getValue('eyesLookUp'));
  console.log("gaze up:", gazeUp.toFixed(3));

  // Moods
  for (const mood of ['happy', 'sad', 'fear', 'neutral']) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise(r => setTimeout(r, 9000));
    const vals = await page.evaluate(() => ({
      mouthSmile: window.__head.getValue('mouthSmile'),
      mouthFrownLeft: window.__head.getValue('mouthFrownLeft'),
      eyeWideLeft: window.__head.getValue('eyeWideLeft'),
    }));
    console.log(mood, "->", JSON.stringify(vals));
  }

  await browser.close();
}
run().catch(e => { console.error("FATAL", e); process.exit(1); });

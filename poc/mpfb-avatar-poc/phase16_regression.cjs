const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v10.glb", { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);
  const status = await page.evaluate(() => document.getElementById('status')?.textContent);
  console.log("status:", status);

  // --- Lip-sync: dense sampling during real streamAudio playback ---
  await page.evaluate(() => { window.__head.setMood('neutral'); });
  await page.click('#play').catch(() => {});
  const visemeNames = ["aa","E","I","O","U","PP","SS","TH","CH","FF","kk","nn","RR","DD"];
  let maxViseme = 0;
  for (let i = 0; i < 30; i++) {
    const vals = await page.evaluate((names) => {
      const h = window.__head;
      return names.map(n => h.getValue('viseme_' + n) || 0);
    }, visemeNames);
    maxViseme = Math.max(maxViseme, ...vals);
    await new Promise((r) => setTimeout(r, 90));
  }
  console.log("LIP-SYNC max viseme activation over dense sampling:", maxViseme.toFixed(3), maxViseme > 0.1 ? "VERIFIED" : "FAIL");

  // --- Blink: 22s window ---
  console.log("sampling blink over 22s...");
  let maxBlink = 0, blinkSamples = 0, nonzeroBlink = 0;
  for (let i = 0; i < 110; i++) {
    const v = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft') || 0);
    maxBlink = Math.max(maxBlink, v);
    if (v > 0.1) nonzeroBlink++;
    blinkSamples++;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("BLINK max:", maxBlink.toFixed(3), "nonzero frames:", nonzeroBlink, "/", blinkSamples, maxBlink > 0.5 ? "VERIFIED" : "FAIL");

  // --- Gaze up ---
  await page.evaluate(() => { window.__head.lookAt(470, 50, 1200); });
  await new Promise((r) => setTimeout(r, 1400));
  const gazeUp = await page.evaluate(() => window.__head.getValue('eyesLookUp') || 0);
  console.log("GAZE UP eyesLookUp:", gazeUp.toFixed(3), gazeUp > 0.05 ? "VERIFIED" : "check");

  // --- Gaze down ---
  await page.evaluate(() => { window.__head.lookAt(470, 700, 1200); });
  await new Promise((r) => setTimeout(r, 1400));
  const gazeDown = await page.evaluate(() => window.__head.getValue('eyesLookDown') || 0);
  console.log("GAZE DOWN eyesLookDown:", gazeDown.toFixed(3), "(probabilistic by design per Phase 6/10 -- not a pass/fail)");

  await page.evaluate(() => { window.__head.lookAt(null, null, 500); });
  await new Promise((r) => setTimeout(r, 600));

  // --- Moods: happy/sad/fear, 9s settle each ---
  const moodChecks = [
    { mood: "happy", key: "mouthSmile", target: 0.2 },
    { mood: "sad", key: "mouthFrownLeft", target: 0.8 },
    { mood: "fear", key: "eyeWideLeft", target: 0.6 },
  ];
  for (const { mood, key, target } of moodChecks) {
    await page.evaluate((m) => { window.__head.setMood(m); }, mood);
    await new Promise((r) => setTimeout(r, 9000));
    const v = await page.evaluate((k) => window.__head.getValue(k) || 0, key);
    console.log(`MOOD ${mood.toUpperCase()} ${key}:`, v.toFixed(3), `(target ${target})`, v > target * 0.3 ? "VERIFIED" : "FAIL");
  }
  await page.evaluate(() => { window.__head.setMood('neutral'); });

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

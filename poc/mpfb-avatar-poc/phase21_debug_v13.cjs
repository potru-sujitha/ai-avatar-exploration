const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { console.log("[console."+m.type()+"]", m.text()); });
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase21-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const status = await page.evaluate(() => document.getElementById('status')?.textContent);
  console.log("STATUS:", status);

  // check blink timer internals directly
  const diag = await page.evaluate(() => {
    const h = window.__head;
    return {
      hasEyeBlinkLeft: h.mtAvatar ? Object.keys(h.mtAvatar).includes('eyeBlinkLeft') : 'no mtAvatar',
      totalMorphs: h.mtAvatar ? Object.keys(h.mtAvatar).length : 0,
      visemeCount: h.mtAvatar ? Object.keys(h.mtAvatar).filter(k=>k.startsWith('viseme_')).length : 0,
      isRunning: h.isRunning,
      moodName: h.moodName,
    };
  });
  console.log("DIAG:", JSON.stringify(diag));

  await page.click('#play').catch((e) => console.log("play click error:", e.message));
  await new Promise(r => setTimeout(r, 1500));
  const afterPlay = await page.evaluate(() => {
    const h = window.__head;
    return { isSpeaking: h.isSpeaking, isAudioPlaying: h.isAudioPlaying, streamError: window.__streamError || null };
  });
  console.log("AFTER PLAY:", JSON.stringify(afterPlay));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

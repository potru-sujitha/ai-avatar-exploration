const puppeteer = require("puppeteer");
(async () => {
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
  const playDisabled = await page.evaluate(() => document.getElementById('play').disabled);
  console.log("play button disabled?", playDisabled);
  await page.evaluate(() => { if (window.__head.audioCtx.state === 'suspended') window.__head.audioCtx.resume(); });
  await page.click('#play');
  console.log("clicked play");
  const samples = [];
  for (let i = 0; i < 30; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      const names = ['viseme_aa','viseme_PP','viseme_O','viseme_E','viseme_I','viseme_U'];
      return { max: Math.max(...names.map(n => h.getValue(n) || 0)), isSpeaking: h.isSpeaking, isAudioPlaying: h.isAudioPlaying };
    });
    samples.push(v);
    await new Promise(r => setTimeout(r, 100));
  }
  console.log(JSON.stringify(samples));
  console.log("overall max:", Math.max(...samples.map(s=>s.max)).toFixed(3));
  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });

const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase19-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log("ready:", ready);

  // Turn ON both effects fresh, let them settle, THEN play audio and sample densely.
  await page.click('#eyeOn');
  await page.click('#skinOn');
  await new Promise((r) => setTimeout(r, 500));

  await page.click('#play');
  const samples = [];
  for (let i = 0; i < 20; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      const names = ['viseme_aa','viseme_E','viseme_O','viseme_I','viseme_U','viseme_PP','viseme_SS','viseme_kk','viseme_FF','viseme_TH','viseme_DD','viseme_CH','viseme_nn','viseme_RR'];
      const vals = names.map(n => h.getValue(n) || 0);
      return { max: Math.max(...vals), isSpeaking: h.isSpeaking, isAudioPlaying: h.isAudioPlaying };
    });
    samples.push(v);
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log(JSON.stringify(samples, null, 0));
  const peak = Math.max(...samples.map(s => s.max));
  console.log("PEAK across all visemes, dense sampling:", peak, peak > 0.05 ? "VERIFIED" : "STILL ZERO - real issue");

  console.log("shader errors:", errors.filter(e => e.includes("Shader") || e.includes("sssColor")).length);
  errors.forEach(e => console.log("  " + e.split("\n")[0]));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

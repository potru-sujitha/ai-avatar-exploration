const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v18_candidate.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);
  await page.click('#play').catch(()=>{});
  let peak = 0, peakViseme = '';
  const visemeNames = ['viseme_sil','viseme_PP','viseme_FF','viseme_TH','viseme_DD','viseme_kk','viseme_CH','viseme_SS','viseme_nn','viseme_RR','viseme_aa','viseme_E','viseme_I','viseme_O','viseme_U'];
  for (let i = 0; i < 80; i++) {
    const r = await page.evaluate((names) => {
      const h = window.__head;
      let best = 0, bestName = '';
      for (const n of names) { const v = h.getValue(n) || 0; if (v > best) { best = v; bestName = n; } }
      return { best, bestName };
    }, visemeNames);
    if (r.best > peak) { peak = r.best; peakViseme = r.bestName; }
    await new Promise((r2) => setTimeout(r2, 50));
  }
  console.log("isolated lip-sync peak over 4s (50ms step, 15 visemes):", peak.toFixed(3), peakViseme);
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

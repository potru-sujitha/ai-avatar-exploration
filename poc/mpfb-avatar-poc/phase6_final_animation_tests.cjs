const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/poc.html?avatar=avatar_v4.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  // Continuous lip-sync: dense sampling across the full real-audio clip (~3s), not just a handful.
  await page.click("#play");
  const lipsyncTrace = [];
  for (let i = 0; i < 45; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      const names = ["viseme_aa","viseme_PP","viseme_O","viseme_E","viseme_kk","viseme_I","viseme_U","viseme_SS","viseme_FF","viseme_nn","viseme_RR","viseme_DD","viseme_CH","viseme_TH"];
      return Math.max(...names.map((n) => h.getValue(n) || 0));
    });
    lipsyncTrace.push(Math.round(v * 1000) / 1000);
    await new Promise((r) => setTimeout(r, 90));
  }
  const nonzeroCount = lipsyncTrace.filter((v) => v > 0.05).length;
  const distinctPeaks = lipsyncTrace.filter((v, i) => v > 0.2 && (i === 0 || lipsyncTrace[i-1] <= v) && (i === lipsyncTrace.length-1 || lipsyncTrace[i+1] <= v)).length;
  console.log("LIPSYNC continuous trace (90ms steps, ~4s window):", JSON.stringify(lipsyncTrace));
  console.log(`LIPSYNC: ${nonzeroCount}/${lipsyncTrace.length} samples active, max=${Math.max(...lipsyncTrace)}, variation across the whole clip (not a single pulse): ${new Set(lipsyncTrace.map(v=>Math.round(v*10))).size} distinct rounded levels`);

  await new Promise((r) => setTimeout(r, 1500)); // let playback fully finish before blink test

  // Fresh 22s blink window
  const blinkSamples = [];
  for (let i = 0; i < 110; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      return Math.max(h.getValue("eyeBlinkLeft")||0, h.getValue("eyeBlinkRight")||0);
    });
    blinkSamples.push(v);
    await new Promise((r) => setTimeout(r, 200));
  }
  const blinkEvents = blinkSamples.filter((v, i) => v > 0.5 && (i === 0 || blinkSamples[i-1] <= 0.5)).length;
  console.log(`BLINK (22s window): max=${Math.max(...blinkSamples)}, distinct blink events crossing 0.5: ${blinkEvents}`);

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

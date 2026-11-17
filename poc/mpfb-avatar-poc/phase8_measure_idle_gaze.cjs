const puppeteer = require("puppeteer");

const PAGE = process.argv[2]; // "poc.html" (original) or "phase8_poc_fixed.html" (fixed)
const TRIALS = parseInt(process.argv[3] || "10", 10);
const SAMPLE_DELAY_MS = 300;

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });

  const results = [];
  for (let i = 0; i < TRIALS; i++) {
    const page = await browser.newPage();
    await page.setViewport({ width: 940, height: 760 });
    await page.goto(`http://localhost:8924/${PAGE}?avatar=./avatar_v5.glb`, { waitUntil: "domcontentloaded", timeout: 30000 });
    for (let j = 0; j < 40; j++) {
      const status = await page.evaluate(() => document.getElementById("status")?.textContent || "");
      if (status.includes("ready")) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    await new Promise((r) => setTimeout(r, SAMPLE_DELAY_MS));
    const v = await page.evaluate(() => {
      const h = window.__head;
      return {
        eyesLookDown: h.getValue("eyesLookDown"),
        eyesLookUp: h.getValue("eyesLookUp"),
        eyeBlinkLeft: h.getValue("eyeBlinkLeft"),
        eyeBlinkRight: h.getValue("eyeBlinkRight"),
        headRotateX: h.getValue("headRotateX"),
      };
    });
    results.push(v);
    await page.close();
  }

  await browser.close();

  const vals = (k) => results.map((r) => r[k] ?? 0);
  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const summary = {};
  for (const k of ["eyesLookDown", "eyesLookUp", "eyeBlinkLeft", "eyeBlinkRight", "headRotateX"]) {
    const arr = vals(k);
    summary[k] = { mean: mean(arr), min: Math.min(...arr), max: Math.max(...arr), samples: arr };
  }
  console.log(JSON.stringify({ page: PAGE, trials: TRIALS, summary }, null, 1));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

const puppeteer = require("puppeteer");

const PAGE = process.argv[2];
const OUT = process.argv[3];

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto(`http://localhost:8924/${PAGE}?avatar=./avatar_v5.glb`, { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let j = 0; j < 40; j++) {
    const status = await page.evaluate(() => document.getElementById("status")?.textContent || "");
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: -1.9, cameraY: 0.22 }); });
  await new Promise((r) => setTimeout(r, 1300));
  const vals = await page.evaluate(() => {
    const h = window.__head;
    return {
      eyesLookDown: h.getValue('eyesLookDown'),
      eyesLookUp: h.getValue('eyesLookUp'),
      eyeBlinkLeft: h.getValue('eyeBlinkLeft'),
      eyeBlinkRight: h.getValue('eyeBlinkRight'),
      browDownLeft: h.getValue('browDownLeft'),
    };
  });
  await page.screenshot({ path: OUT });
  console.log(OUT, JSON.stringify(vals));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

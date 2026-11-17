const puppeteer = require("puppeteer");

const PAGE = process.argv[2]; // phase8_poc_fixed.html

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

  // --- Blink naturalness: sample over 22s window (established pattern) ---
  const samples = [];
  const start = Date.now();
  while (Date.now() - start < 22000) {
    const v = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft'));
    samples.push(v ?? 0);
    await new Promise((r) => setTimeout(r, 200));
  }
  const maxBlink = Math.max(...samples);
  const events = samples.filter((v) => v > 0.5).length;
  console.log("BLINK: max =", maxBlink, "| frames above 0.5 threshold =", events, "/ ", samples.length);

  // --- Intentional lookAt() still works: far-left target should drive real paired values ---
  await page.evaluate(() => { window.__head.lookAt(5, 380, 2000); });
  await new Promise((r) => setTimeout(r, 1200));
  const gaze = await page.evaluate(() => {
    const h = window.__head;
    return { eyeLookOutLeft: h.getValue('eyeLookOutLeft'), eyeLookInRight: h.getValue('eyeLookInRight') };
  });
  console.log("LOOKAT (far-left target):", JSON.stringify(gaze));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

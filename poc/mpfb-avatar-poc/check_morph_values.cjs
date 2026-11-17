const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/poc.html?avatar=avatar_v2.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const vals = await page.evaluate(() => {
    const h = window.__head;
    const names = ["eyeSquintLeft","eyeSquintRight","noseSneerLeft","noseSneerRight","browDownLeft","browDownRight",
                    "mouthShrugUpper","mouthUpperUpLeft","mouthUpperUpRight","jawOpen","mouthOpen","mouthClose",
                    "mouthFunnel","mouthPucker","eyeWideLeft","eyeWideRight","mouthLowerDownLeft","mouthLowerDownRight"];
    return Object.fromEntries(names.map(n => [n, h.getValue(n)]));
  });
  console.log("morph values on loaded avatar (requested mood: neutral):", JSON.stringify(vals, null, 1));
  const moodInfo = await page.evaluate(() => ({ moodName: window.__head.moodName, currentMood: window.__head.getMood() }));
  console.log("active mood:", JSON.stringify(moodInfo));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

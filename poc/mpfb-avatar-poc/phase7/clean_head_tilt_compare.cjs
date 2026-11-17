const puppeteer = require("puppeteer");

async function captureClean(avatarFile, outPrefix) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto(`http://localhost:8924/poc.html?avatar=${avatarFile}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  // immediately, minimal idle drift time
  await page.evaluate(() => { window.__head.setView('head', {cameraDistance:-1.7}); });
  await new Promise((r) => setTimeout(r, 1400));
  await page.screenshot({ path: `phase7/${outPrefix}_face_closeup_clean.png` });

  await page.evaluate(() => { window.__head.setView('head', {cameraDistance:-1.9, cameraY:0.22}); });
  await new Promise((r) => setTimeout(r, 1400));
  await page.screenshot({ path: `phase7/${outPrefix}_eyes_closeup_clean.png` });

  console.log(`captured ${outPrefix} clean comparison shots`);
  await browser.close();
}

(async () => {
  await captureClean("avatar_v4.glb", "v4");
  await captureClean("avatar_v5.glb", "v5");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

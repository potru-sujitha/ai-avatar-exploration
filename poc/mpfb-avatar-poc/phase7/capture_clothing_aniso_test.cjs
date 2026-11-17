const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/poc.html?avatar=avatar_v4.glb", { waitUntil: "domcontentloaded", timeout: 30000 });

  for (let i = 0; i < 40; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  const anisoInfo = await page.evaluate(() => window.__anisoResult);
  console.log("anisotropy applied:", JSON.stringify(anisoInfo));

  // clothing close-up, similar framing to phase6_upper_body but tighter on the chest/shoulder curve
  await page.evaluate(() => { window.__head.setView('mid', { cameraDistance: -0.3, cameraY: -0.25 }); });
  await new Promise((r) => setTimeout(r, 1400));
  await page.screenshot({ path: "phase7/clothing_closeup_WITH_aniso.png" });
  console.log("captured WITH anisotropy");

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

const puppeteer = require("puppeteer");

async function capture(avatarFile, outPrefix) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log(`[${outPrefix} pageerror]`, e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto(`http://localhost:8924/poc.html?avatar=${avatarFile}`, { waitUntil: "domcontentloaded", timeout: 30000 });

  for (let i = 0; i < 60; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const status = await page.evaluate(() => document.getElementById("status").textContent);
  console.log(`[${outPrefix}] status:`, status);

  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: `${outPrefix}_neutral.png` });

  // Let idle animation run for a few seconds so bones actually rotate away from rest
  // (breathing, idle head/eye movement) -- this is exactly the condition that exposes
  // a bone-roll/bind-pose mismatch, which a static rest-pose render would never show.
  await new Promise((r) => setTimeout(r, 4000));
  await page.screenshot({ path: `${outPrefix}_posed_4s.png` });

  await new Promise((r) => setTimeout(r, 4000));
  await page.screenshot({ path: `${outPrefix}_posed_8s.png` });

  await browser.close();
}

(async () => {
  await capture("avatar_v1_copy.glb", "v1");
  await capture("avatar_v2.glb", "v2");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

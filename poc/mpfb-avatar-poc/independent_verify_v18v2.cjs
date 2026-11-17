const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v18_candidate_v2.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
  console.log("ready:", ready, "| status:", status.replace(/\n/g, ' '));

  // close-up on hairline/part
  await page.evaluate(() => {
    window.__head.setView('head', { cameraDistance: -0.3, cameraY: 0.55, cameraX: 0 });
  });
  await new Promise((r) => setTimeout(r, 1300));
  await page.screenshot({ path: "independent_v18v2_closeup.png" });

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

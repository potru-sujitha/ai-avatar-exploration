const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 800, height: 700 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v19_candidate.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
  console.log("status:", status.replace(/\n/g,' | '));
  await page.evaluate(() => { document.getElementById('panel').style.display = 'none'; });

  // hairline check (known revealing framing)
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: -0.42, cameraY: 0.56, cameraX: 0 }); });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: "FINAL_v19_hairline.png" });

  // chest/neckline check for tie
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: 0.1, cameraY: 0.1, cameraX: 0 }); });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: "FINAL_v19_chest.png" });

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

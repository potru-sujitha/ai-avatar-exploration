const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 750, height: 580 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./phase39_debug1.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await page.evaluate(() => { document.getElementById('panel').style.display = 'none'; });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: "phase39_debug1_front.png" });
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

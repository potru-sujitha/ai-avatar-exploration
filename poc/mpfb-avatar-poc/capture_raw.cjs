const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/raw_threejs_test.html?avatar=avatar_v2.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 40; i++) {
    const ready = await page.evaluate(() => window.__ready === true);
    if (ready) break;
    await new Promise(r => setTimeout(r, 300));
  }
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: "raw_threejs_bindpose.png" });
  console.log(await page.evaluate(() => document.getElementById('status').textContent));
  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });

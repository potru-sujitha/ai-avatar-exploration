const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise(r => setTimeout(r, 200));
  }
  console.log("ready:", ready, "errors:", errors.length);
  errors.forEach(e => console.log(e));
  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
  console.log(status);
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: "phase20-scratch/quick_check.png" });
  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });

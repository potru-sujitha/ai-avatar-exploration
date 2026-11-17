const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase17-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  // Let the neutral smile baseline fully settle (~9s per established convergence curve).
  await new Promise(r => setTimeout(r, 9000));
  await page.screenshot({ path: "phase17_report_neutral_smile.png" });
  console.log("captured neutral+smile, settled smile value:", await page.evaluate(()=>window.__head.getValue('mouthSmile')));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

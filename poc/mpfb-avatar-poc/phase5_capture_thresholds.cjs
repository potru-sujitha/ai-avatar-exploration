const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const thresholds = ["0.3", "0.5", "0.6", "0.7"];
  for (const t of thresholds) {
    const page = await browser.newPage();
    await page.setViewport({ width: 940, height: 760 });
    await page.goto(`http://localhost:8924/raw_threejs_test.html?avatar=phase5_body_t${t}.glb`, { waitUntil: "domcontentloaded", timeout: 30000 });
    for (let i = 0; i < 30; i++) {
      const status = await page.evaluate(() => document.getElementById("status").textContent);
      if (status.includes("rendered") || status.includes("ERROR")) { console.log(t, status); break; }
      await new Promise((r) => setTimeout(r, 300));
    }
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: `phase5_body_t${t}.png` });
    console.log("captured threshold", t);
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

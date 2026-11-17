const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  for (const engine of ["test_original.html", "test_idlegaze_fixed.html"]) {
    const page = await browser.newPage();
    await page.goto(`http://localhost:8924/phase10-integration-test/${engine}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    for (let i = 0; i < 60; i++) { if (await page.evaluate(() => window.__ready === true)) break; await new Promise(r => setTimeout(r, 300)); }
    await page.evaluate(() => { window.__head.setMood('sad'); });
    const samples = [];
    for (let t = 0; t <= 8000; t += 1000) {
      await new Promise(r => setTimeout(r, 1000));
      const v = await page.evaluate(() => window.__head.getValue('mouthFrownLeft') || 0);
      samples.push({ t: t + 1000, v });
    }
    console.log(engine, JSON.stringify(samples));
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

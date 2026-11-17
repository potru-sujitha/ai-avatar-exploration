const puppeteer = require("puppeteer");
const glb = process.argv[2];
const out = process.argv[3];
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ width: 700, height: 700 });
  await page.goto(`http://localhost:8925/test_view.html?glb=${glb}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 40; i++) {
    const ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const meshCount = await page.evaluate(() => window.__meshCount).catch(() => null);
  console.log("meshCount:", meshCount, "errors:", errors.length);
  errors.forEach((e) => console.log("  ", e));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: out });

  // Simple real-time-vs-frame-count performance probe: count actual RAF frames
  // delivered over a fixed 2s wall-clock window.
  const frameCount = await page.evaluate(() => new Promise((resolve) => {
    let n = 0;
    const t0 = performance.now();
    function tick() {
      n++;
      if (performance.now() - t0 < 2000) requestAnimationFrame(tick);
      else resolve(n);
    }
    requestAnimationFrame(tick);
  }));
  console.log("frames in 2000ms (~" + (frameCount / 2).toFixed(1) + " fps):", frameCount);

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

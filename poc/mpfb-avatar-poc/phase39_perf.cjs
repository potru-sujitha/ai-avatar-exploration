const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-background-timer-throttling"],
  });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 750, height: 580 });
  const t0 = Date.now();
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v19_candidate.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const loadMs = Date.now() - t0;
  const fps = await page.evaluate(async () => {
    let frames = 0;
    const start = performance.now();
    await new Promise((resolve) => {
      function tick() {
        frames++;
        if (performance.now() - start < 3000) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
    const elapsed = (performance.now() - start) / 1000;
    return frames / elapsed;
  });
  console.log("load ready ms:", loadMs, "| ready:", ready, "| avg fps (3s, swiftshader software render):", fps.toFixed(1));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

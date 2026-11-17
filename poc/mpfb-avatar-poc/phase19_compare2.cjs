const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase19-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log("ready:", ready);
  await new Promise((r) => setTimeout(r, 1500));

  await page.screenshot({ path: "phase19_baseline_off.png" });
  console.log("captured baseline");

  await page.click('#eyeOn');
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: "phase19_eye_only.png" });
  console.log("captured eye-only");

  await page.click('#eyeOff');
  await page.click('#skinOn');
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: "phase19_skin_only.png" });
  console.log("captured skin-only");

  await page.click('#eyeOn');
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: "phase19_combined.png" });
  console.log("captured combined");

  // Performance: warm up (discard first measurement -- shader compile/first-use stalls are
  // one-time costs, not representative of steady-state cost), then measure properly.
  async function measureFPS(ms) {
    return await page.evaluate((duration) => new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function tick() {
        frames++;
        const elapsed = performance.now() - start;
        if (elapsed < duration) requestAnimationFrame(tick);
        else resolve({ frames, ms: elapsed, fps: frames / (elapsed / 1000) });
      }
      requestAnimationFrame(tick);
    }), ms);
  }
  await measureFPS(1500); // warm-up, discarded
  const fpsWithEffects = await measureFPS(3000);
  console.log("FPS with both effects ON (post-warmup):", JSON.stringify(fpsWithEffects));

  await page.click('#eyeOff');
  await page.click('#skinOff');
  await new Promise((r) => setTimeout(r, 500));
  await measureFPS(1000); // warm-up
  const fpsBaseline = await measureFPS(3000);
  console.log("FPS baseline, both OFF (post-warmup):", JSON.stringify(fpsBaseline));

  console.log("errors:", errors.length);
  errors.forEach(e => console.log("  " + e.split("\n")[0]));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

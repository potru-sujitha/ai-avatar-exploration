const puppeteer = require("puppeteer");

async function captureEyesOpen(page, path, maxTries = 15) {
  for (let i = 0; i < maxTries; i++) {
    const blink = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft') || 0);
    if (blink < 0.1) { await page.screenshot({ path }); return true; }
    await new Promise((r) => setTimeout(r, 150));
  }
  await page.screenshot({ path }); // fallback, whatever state
  return false;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase19-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log("ready:", ready);
  await new Promise((r) => setTimeout(r, 500));

  const okBase = await captureEyesOpen(page, "phase19_baseline_eyesopen.png");
  console.log("baseline eyes-open captured:", okBase);

  await page.click('#eyeOn');
  await new Promise((r) => setTimeout(r, 400));
  const okEye = await captureEyesOpen(page, "phase19_eye_only_eyesopen.png");
  console.log("eye-only eyes-open captured:", okEye);

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push("[console.error] " + m.text()); });
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v8.glb", { waitUntil: "domcontentloaded", timeout: 30000 });

  // Capture the VERY FIRST frame right when ready flips true -- the exact moment the
  // original camera bug would have shown wrong framing (before the old 1000ms tween).
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log("ready:", ready);
  // Screenshot IMMEDIATELY, no extra wait -- this is the critical test.
  await page.screenshot({ path: "independent_v8_FIRST_FRAME_no_wait.png" });
  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
  console.log("status at first-frame capture:", status);

  console.log("errors:", errors.length);
  errors.forEach((e) => console.log(e));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

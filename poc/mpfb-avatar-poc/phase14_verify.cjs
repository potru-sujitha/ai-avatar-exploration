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
  page.on("response", (r) => { if (r.status() >= 400 && !r.url().includes("favicon")) errors.push("[http " + r.status() + "] " + r.url()); });
  await page.setViewport({ width: 940, height: 760 });

  const t0 = Date.now();
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v8.glb&_=" + t0, { waitUntil: "domcontentloaded", timeout: 30000 });

  // Capture the first frame right as the model finishes loading and framing/lighting apply --
  // this is the exact moment that mattered for the camera-init bug (showAvatar() resolving,
  // before the timeline/audio fetch that __ready also waits on). Poll for the status text to
  // change away from "loading..." rather than guessing a fixed delay for a 50MB model load.
  for (let i = 0; i < 100; i++) {
    const txt = await page.evaluate(() => document.getElementById('status')?.textContent || '');
    if (txt && !txt.startsWith('loading')) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  await page.screenshot({ path: "phase14_first_frame.png" });

  let ready = false;
  for (let i = 0; i < 40; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
  console.log("ready:", ready);
  console.log("status:", status);

  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: "phase14_neutral.png" });

  await page.click('#play').catch((e) => errors.push("play click failed: " + e.message));
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: "phase14_midspeech.png" });
  await new Promise((r) => setTimeout(r, 3000));

  // Close-up: zoom via setView('head') with a smaller distance/higher Y for a face+collar crop.
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: 0.1, cameraY: 0.55, cameraX: 0 }); });
  await new Promise((r) => setTimeout(r, 1300));
  await page.screenshot({ path: "phase14_closeup.png" });

  console.log("errors captured:", errors.length);
  errors.forEach((e) => console.log(e));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

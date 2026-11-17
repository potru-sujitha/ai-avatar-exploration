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
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v10.glb", { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);
  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
  console.log("status:", status);

  await page.screenshot({ path: "phase16_v10_FINAL_neutral.png" });

  // mid-speech
  await page.click('#play').catch(() => {});
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: "phase16_v10_FINAL_midspeech.png" });
  await new Promise((r) => setTimeout(r, 2500)); // let it finish

  // close-up via setView('head') with tighter distance, done in-page
  await page.evaluate(() => {
    window.__head.setView('head', { cameraDistance: 0.3, cameraY: 0.5, cameraX: 0 });
  });
  await new Promise((r) => setTimeout(r, 1400));
  await page.screenshot({ path: "phase16_v10_FINAL_closeup.png" });

  console.log("errors:", errors.length);
  errors.forEach((e) => console.log(e));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

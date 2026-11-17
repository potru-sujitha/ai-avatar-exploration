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
  page.on("response", (r) => { if (r.status() >= 400) errors.push("[http " + r.status() + "] " + r.url()); });
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v7.glb", { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 40; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS EL');
  console.log("ready:", ready);
  console.log("status:", status);

  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: "independent_v7_neutral.png" });

  // mid-speech check
  await page.click('#play').catch((e) => errors.push("play click failed: " + e.message));
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: "independent_v7_midspeech.png" });

  console.log("errors captured:", errors.length);
  errors.forEach((e) => console.log(e));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

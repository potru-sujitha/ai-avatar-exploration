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
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v9.glb", { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
  console.log("ready:", ready);
  console.log("status:", status);

  await page.screenshot({ path: "phase15_v9_neutral_first_frame.png" });

  // close-up on hair+shoulders via a quick zoom (reuse setView if exposed, else just crop viewport region later)
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: "phase15_v9_neutral_settled.png" });

  // mid-speech
  await page.click('#play').catch((e) => errors.push("play click failed: " + e.message));
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: "phase15_v9_midspeech.png" });
  await new Promise((r) => setTimeout(r, 1500));

  // trigger blink for a visible check
  await page.click('#stop').catch(() => {});
  await page.click('#trigger-blink,#blink').catch(() => {});

  console.log("arkit/viseme info from status above");
  console.log("errors:", errors.length);
  errors.forEach((e) => console.log(e));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

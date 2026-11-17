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
  await page.goto("http://localhost:8924/phase12-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 40; i++) {
    ready = await page.evaluate(() => window.__ready === true);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log("ready:", ready);
  const status = await page.evaluate(() => document.getElementById('status').textContent);
  console.log("status:", status);

  await page.screenshot({ path: "phase12_demo_loaded.png" });

  // Exercise each control for real, check for thrown errors.
  await page.click('#play');
  await new Promise((r) => setTimeout(r, 800));
  await page.click('#stop');
  await new Promise((r) => setTimeout(r, 200));
  await page.click('#blink');
  await new Promise((r) => setTimeout(r, 300));
  await page.click('#lookUp');
  await new Promise((r) => setTimeout(r, 1300));
  await page.screenshot({ path: "phase12_demo_lookup.png" });
  await page.click('#lookDown');
  await new Promise((r) => setTimeout(r, 1300));
  await page.screenshot({ path: "phase12_demo_lookdown.png" });
  await page.click('#lookCenter');
  await new Promise((r) => setTimeout(r, 1100));
  await page.click('#moodHappy');
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: "phase12_demo_happy.png" });
  await page.click('#moodSad');
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: "phase12_demo_sad.png" });
  await page.click('#moodFear');
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: "phase12_demo_fear.png" });
  await page.click('#reset');
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: "phase12_demo_reset.png" });

  console.log("errors captured:", errors.length);
  errors.forEach((e) => console.log(e));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

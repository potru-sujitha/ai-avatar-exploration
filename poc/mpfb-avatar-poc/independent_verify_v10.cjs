const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
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
  await page.screenshot({ path: "independent_v10_neutral.png" });
  console.log("errors:", errors.length);
  errors.forEach(e => console.log(e));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

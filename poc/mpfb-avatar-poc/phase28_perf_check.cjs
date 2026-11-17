const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v16.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => window.__ready === true).catch(() => false)) break;
    await new Promise(r => setTimeout(r, 200));
  }
  const before = await page.evaluate(() => window.__head.animClock);
  const t0 = Date.now();
  await new Promise(r => setTimeout(r, 2000));
  const after = await page.evaluate(() => window.__head.animClock);
  const realMs = Date.now() - t0;
  console.log("animClock delta:", after - before, "real ms:", realMs, "ratio:", (after-before)/realMs);
  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });

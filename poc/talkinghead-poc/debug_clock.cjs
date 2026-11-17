const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:8923/poc.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 30; i++) { if (await page.evaluate(() => window.__ready)) break; await new Promise(r=>setTimeout(r,300)); }
  const clockBefore = await page.evaluate(() => window.__head.animClock);
  console.log("animClock before play:", clockBefore);
  await page.click("#play");
  const samples = [];
  for (let i = 0; i < 10; i++) {
    samples.push(await page.evaluate(() => ({ clock: window.__head.animClock, aa: window.__head.getValue('viseme_aa'), o: window.__head.getValue('viseme_O') })));
    await new Promise(r => setTimeout(r, 300));
  }
  console.log(JSON.stringify(samples, null, 1));
  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });

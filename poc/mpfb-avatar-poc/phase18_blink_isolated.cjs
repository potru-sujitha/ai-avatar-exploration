const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshare", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase18-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);
  const samples = [];
  for (let i = 0; i < 88; i++) {
    const v = await page.evaluate(() => Math.max(window.__head.getValue('eyeBlinkLeft')||0, window.__head.getValue('eyeBlinkRight')||0));
    samples.push(v);
    await new Promise(r => setTimeout(r, 250));
  }
  console.log("max over ~22s (250ms steps):", Math.max(...samples).toFixed(3));
  console.log("nonzero frames:", samples.filter(v=>v>0.1).length, "/", samples.length);
  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });

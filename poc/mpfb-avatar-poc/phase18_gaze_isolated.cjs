const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
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

  await page.evaluate(() => {
    const r = document.getElementById('avatar').getBoundingClientRect();
    window.__head.lookAt(r.left + r.width/2, r.bottom - 10, 1200);
  });
  await new Promise(r => setTimeout(r, 1800));
  const down = await page.evaluate(() => window.__head.getValue('eyesLookDown'));
  console.log("gaze down (after 1.8s settle):", down.toFixed(3));

  await page.evaluate(() => {
    const r = document.getElementById('avatar').getBoundingClientRect();
    window.__head.lookAt(r.left + r.width/2, r.top + 10, 1200);
  });
  await new Promise(r => setTimeout(r, 1800));
  const up = await page.evaluate(() => window.__head.getValue('eyesLookUp'));
  console.log("gaze up (after 1.8s settle):", up.toFixed(3));

  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });

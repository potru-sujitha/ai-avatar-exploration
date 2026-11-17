const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v17.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);
  await page.evaluate(() => window.__head.setMood('happy'));

  let minY = 999, maxY = -999;
  for (let i = 0; i < 40; i++) {
    const y = await page.evaluate(() => window.__head.getValue('bodyRotateY') || 0);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log("happy mood bodyRotateY range over 12s (rad):", minY.toFixed(3), "to", maxY.toFixed(3));
  console.log("in degrees:", (minY*180/Math.PI).toFixed(1), "to", (maxY*180/Math.PI).toFixed(1));
  await page.screenshot({ path: "independent_v34_happy_sway.png" });
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

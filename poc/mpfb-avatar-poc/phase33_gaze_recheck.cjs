const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v18_candidate_v2.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);
  for (let trial = 0; trial < 4; trial++) {
    await page.evaluate(() => window.__head.lookAt(null, null, 300));
    await new Promise((r) => setTimeout(r, 500));
    const r = await page.evaluate(() => {
      const el = document.getElementById('avatar').getBoundingClientRect();
      return { left: el.left, top: el.top, height: el.height };
    });
    await page.evaluate((rect) => { window.__head.lookAt(rect.left + 10, rect.top + rect.height/2, 1200); }, r);
    await new Promise((res) => setTimeout(res, 1400));
    const v = await page.evaluate(() => window.__head.getValue('eyeLookOutLeft') || 0);
    const v2 = await page.evaluate(() => window.__head.getValue('eyeLookInRight') || 0);
    console.log(`trial ${trial}: eyeLookOutLeft=${v.toFixed(3)} eyeLookInRight=${v2.toFixed(3)}`);
  }
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

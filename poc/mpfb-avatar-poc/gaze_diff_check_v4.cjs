const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  for (const avatar of ["avatar_v3.glb", "avatar_v4.glb"]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 940, height: 760 });
    await page.goto(`http://localhost:8924/poc.html?avatar=${avatar}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    for (let i = 0; i < 60; i++) {
      const status = await page.evaluate(() => document.getElementById("status").textContent);
      if (status.includes("ready")) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    // try several targets/timings
    const results = {};
    for (const [label, x, y, t, wait] of [["orig", 5, 380, 1500, 1000], ["longer_wait", 5, 380, 1500, 2500], ["extreme", 1, 400, 2000, 2500]]) {
      await page.evaluate((x,y,t) => { window.__head.lookAt(x, y, t); }, x, y, t);
      await new Promise((r) => setTimeout(r, wait));
      const v = await page.evaluate(() => ({ out: window.__head.getValue("eyeLookOutLeft"), inr: window.__head.getValue("eyeLookInRight") }));
      results[label] = v;
    }
    console.log(avatar, JSON.stringify(results));
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

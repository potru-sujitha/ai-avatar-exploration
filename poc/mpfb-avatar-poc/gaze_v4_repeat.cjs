const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  for (let run = 1; run <= 4; run++) {
    const page = await browser.newPage();
    await page.setViewport({ width: 940, height: 760 });
    await page.goto(`http://localhost:8924/poc.html?avatar=avatar_v4.glb`, { waitUntil: "domcontentloaded", timeout: 30000 });
    for (let i = 0; i < 60; i++) {
      const status = await page.evaluate(() => document.getElementById("status").textContent);
      if (status.includes("ready")) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    await page.evaluate(() => { window.__head.lookAt(1, 400, 2000); });
    await new Promise((r) => setTimeout(r, 2500));
    const v = await page.evaluate(() => ({ out: window.__head.getValue("eyeLookOutLeft"), inr: window.__head.getValue("eyeLookInRight") }));
    console.log("run", run, JSON.stringify(v));
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

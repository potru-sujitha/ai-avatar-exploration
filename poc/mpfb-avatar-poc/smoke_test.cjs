const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/poc.html?avatar=TalkingHead/avatars/brunette.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 40; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) { console.log("STATUS:", status); break; }
    await new Promise((r) => setTimeout(r, 300));
  }
  await page.click("#play");
  const samples = [];
  for (let i = 0; i < 10; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      return Math.max(h.getValue("viseme_aa")||0, h.getValue("viseme_O")||0, h.getValue("viseme_E")||0);
    });
    samples.push(v);
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log("max viseme samples:", samples);
  console.log("any nonzero (lip-sync works):", samples.some(v => v > 0.1));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

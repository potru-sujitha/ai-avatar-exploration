const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8923/poc.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 30; i++) {
    if (await page.evaluate(() => window.__ready)) break;
    await new Promise(r => setTimeout(r, 300));
  }
  await page.screenshot({ path: "idle_front.png" });
  console.log("idle screenshot captured");

  await page.click("#play");
  // sample viseme_aa over the real 3-second clip to prove genuine movement
  const samples = [];
  for (let i = 0; i < 24; i++) {
    const v = await page.evaluate(() => {
      const names = ["viseme_aa","viseme_PP","viseme_O","viseme_E","viseme_FF","viseme_kk"];
      return Object.fromEntries(names.map(n => [n, window.__head.getValue(n)]));
    });
    samples.push(v);
    await new Promise(r => setTimeout(r, 130));
    if (i === 6) await page.screenshot({ path: "speaking_front.png" });
  }
  console.log("viseme samples over playback:", JSON.stringify(samples));
  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });

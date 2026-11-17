const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8923/poc2.html", { waitUntil: "domcontentloaded", timeout: 30000 });

  for (let i = 0; i < 40; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  await page.click("#play");

  let captured = false;
  for (let i = 0; i < 40; i++) {
    const maxVal = await page.evaluate(() => {
      const h = window.__head;
      const names = ["viseme_aa","viseme_PP","viseme_O","viseme_E","viseme_kk","viseme_I","viseme_U","viseme_SS","viseme_FF"];
      return Math.max(...names.map((n) => h.getValue(n) || 0));
    });
    if (maxVal > 0.4 && !captured) {
      await page.screenshot({ path: "speaking_mouth_open.png" });
      console.log("captured at maxVal =", maxVal);
      captured = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 80));
  }
  if (!captured) console.log("never saw maxVal > 0.4 in window");

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

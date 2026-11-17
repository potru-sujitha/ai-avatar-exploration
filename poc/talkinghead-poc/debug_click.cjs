const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("console", (m) => console.log("[console]", m.text()));
  page.on("pageerror", (e) => console.log("[pageerror]", e.message, e.stack));
  page.on("requestfailed", (r) => console.log("[requestfailed]", r.url(), r.failure()?.errorText));
  await page.goto("http://localhost:8923/poc.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 30; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  await new Promise(r => setTimeout(r, 1500));
  const disabled = await page.evaluate(() => document.getElementById('play').disabled);
  console.log("play button disabled?", disabled);
  await page.click("#play");
  await new Promise(r => setTimeout(r, 1000));
  const val = await page.evaluate(() => window.__head.getValue('viseme_aa'));
  console.log("viseme_aa value after click+1s:", val);
  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });

const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/poc.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 40; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const samples = [];
  for (let i = 0; i < 90; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      return Math.max(h.getValue("eyeBlinkLeft")||0, h.getValue("eyeBlinkRight")||0);
    });
    samples.push(v);
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("max blink over 18s:", Math.max(...samples));
  console.log("nonzero frames:", samples.filter(v => v > 0.05).length, "/", samples.length);
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

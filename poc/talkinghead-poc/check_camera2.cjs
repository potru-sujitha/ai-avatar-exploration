const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8923/poc2.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 40; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  // extreme far-left target
  await page.evaluate(() => { window.__head.lookAt(5, 380, 2000); });
  await new Promise((r) => setTimeout(r, 1200));
  const left = await page.evaluate(() => {
    const h = window.__head;
    return { eyeLookOutLeft: h.getValue('eyeLookOutLeft'), eyeLookInRight: h.getValue('eyeLookInRight'), eyesRotateY_underlying_diff: null };
  });
  console.log("look far-left:", left);
  // extreme far-right target
  await page.evaluate(() => { window.__head.lookAt(935, 380, 2000); });
  await new Promise((r) => setTimeout(r, 1200));
  const right = await page.evaluate(() => {
    const h = window.__head;
    return { eyeLookOutRight: h.getValue('eyeLookOutRight'), eyeLookInLeft: h.getValue('eyeLookInLeft') };
  });
  console.log("look far-right:", right);
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

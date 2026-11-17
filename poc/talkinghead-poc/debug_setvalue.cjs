const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:8923/poc.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 30; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  const result = await page.evaluate(async () => {
    const h = window.__head;
    const before = h.getValue('viseme_aa');
    h.setValue('viseme_aa', 0.8, 0);
    const immediately = h.getValue('viseme_aa');
    await new Promise(r => setTimeout(r, 500));
    const after500ms = h.getValue('viseme_aa');
    // also check mtAvatar keys directly
    const keys = Object.keys(h.mtAvatar || {}).filter(k => k.includes('viseme'));
    return { before, immediately, after500ms, visemeKeys: keys };
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });

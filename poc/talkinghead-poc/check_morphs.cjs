const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:8923/poc2.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 40; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const names = await page.evaluate(() => Object.keys(window.__head.mtAvatar).sort());
  console.log("total mtAvatar keys:", names.length);
  console.log("has eyeLookOutLeft:", names.includes("eyeLookOutLeft"));
  console.log("eye-related keys:", names.filter(n => n.toLowerCase().includes("eye")));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

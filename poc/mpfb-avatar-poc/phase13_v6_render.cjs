const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.setViewport({ width: 900, height: 720 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v6.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => window.__ready === true)) break; await new Promise((r) => setTimeout(r, 300)); }
  const status = await page.evaluate(() => document.getElementById('status').textContent);
  console.log("status:", status);
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: "phase13_v6_neutral.png" });
  console.log("captured v6 neutral (final camera+lighting+clothing)");
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  const logs = [];
  page.on("console", (m) => logs.push(m.text()));
  page.on("pageerror", (e) => logs.push("PAGEERROR: " + e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase26-demo.html?avatar=./phase30_fixed20.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const playBtnExists = await page.evaluate(() => !!document.getElementById('play'));
  console.log("ready:", ready, "playBtnExists:", playBtnExists);
  await page.click('#play').catch(e => console.log("click failed:", e.message));
  await new Promise((r) => setTimeout(r, 1500));
  const statusText = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
  console.log("status after click:", statusText);
  const audioState = await page.evaluate(() => window.__head ? window.__head.audioCtx.state : 'no head');
  console.log("audioCtx.state:", audioState);
  console.log("---console logs---");
  logs.forEach(l => console.log(l));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

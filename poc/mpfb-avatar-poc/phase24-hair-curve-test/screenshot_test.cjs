const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.setViewport({ width: 700, height: 700 });
  await page.goto("http://localhost:8925/test_view.html", { waitUntil: "domcontentloaded", timeout: 20000 });
  let ready = false;
  for (let i = 0; i < 30; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise(r => setTimeout(r, 300));
  }
  console.log("ready:", ready, "meshCount:", await page.evaluate(() => window.__meshCount).catch(()=>'?'));
  const err = await page.evaluate(() => window.__error).catch(()=>null);
  if (err) console.log("ERROR:", err);
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: "browser_render_ribbon_hair.png" });
  console.log("errors:", errors.length);
  errors.forEach(e => console.log(e));
  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });

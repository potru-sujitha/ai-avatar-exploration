const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto(`http://localhost:8925/raw_threejs_test.html?avatar=minimal_body.glb`, { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 30; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("rendered") || status.includes("ERROR")) { console.log(status); break; }
    await new Promise((r) => setTimeout(r, 300));
  }
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: "check_body_only.png" });
  console.log("captured");
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

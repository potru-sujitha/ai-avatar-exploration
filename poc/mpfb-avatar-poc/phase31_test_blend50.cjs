const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v18_blend50_TEST.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);
  await new Promise((r) => setTimeout(r, 500));
  // same closeup framing as phase31_hairline_compare.cjs
  await page.evaluate(() => {
    const h = window.__head;
    h.camera.position.set(0, 1.62, 0.55);
    h.camera.lookAt(0, 1.63, 0);
    h.controls.target.set(0, 1.63, 0);
    h.controls.update();
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase31_blend50_closeup_hairline.png" });

  // top view, same as before
  await page.evaluate(() => {
    const h = window.__head;
    h.camera.position.set(0.02, 1.95, 0.05);
    h.camera.lookAt(0, 1.55, 0);
    h.controls.target.set(0, 1.55, 0);
    h.controls.update();
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase31_blend50_top.png" });
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

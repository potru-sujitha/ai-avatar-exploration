const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v17.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);
  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
  console.log("status:", status);
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: "independent_v17_front.png" });

  // top view via direct camera manipulation
  await page.evaluate(() => {
    const h = window.__head;
    const dist = h.camera.position.length();
    h.camera.position.set(0, 1.75, 0.15);
    h.camera.lookAt(0, 1.6, 0);
    h.controls.target.set(0, 1.6, 0);
    h.controls.update();
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "independent_v17_top.png" });
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

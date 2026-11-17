const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v9.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await new Promise((r) => setTimeout(r, 500));

  // Drag-rotate the OrbitControls to get a 3/4 turned view, to inspect hair-shoulder intersection.
  const avatarEl = await page.$('#avatar');
  const box = await avatarEl.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 180, cy, { steps: 20 });
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: "phase15_v9_turned_view.png" });
  console.log("captured turned view");

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

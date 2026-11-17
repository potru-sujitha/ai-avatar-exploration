const puppeteer = require("puppeteer");

async function capture(page, avatarFile, outPrefix) {
  await page.goto(`http://localhost:8924/phase20-demo.html?avatar=./${avatarFile}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(avatarFile, "ready:", ready);
  await new Promise((r) => setTimeout(r, 500));

  // Front view, same framing as every prior phase
  await page.screenshot({ path: `${outPrefix}_front.png` });

  // Close-up on forehead/hairline/center-part specifically
  await page.evaluate(() => {
    const h = window.__head;
    h.camera.position.set(0, 1.62, 0.55);
    h.camera.lookAt(0, 1.63, 0);
    h.controls.target.set(0, 1.63, 0);
    h.controls.update();
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: `${outPrefix}_closeup_hairline.png` });

  // Top view, direct camera manipulation (established technique)
  await page.evaluate(() => {
    const h = window.__head;
    h.camera.position.set(0.02, 1.95, 0.05);
    h.camera.lookAt(0, 1.55, 0);
    h.controls.target.set(0, 1.55, 0);
    h.controls.update();
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: `${outPrefix}_top.png` });

  // Three-quarter left
  await page.evaluate(() => {
    const h = window.__head;
    const r = 0.9, angle = 0.6;
    h.camera.position.set(r * Math.sin(angle), 1.62, r * Math.cos(angle));
    h.camera.lookAt(0, 1.62, 0);
    h.controls.target.set(0, 1.62, 0);
    h.controls.update();
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: `${outPrefix}_threequarter_left.png` });

  // Side view
  await page.evaluate(() => {
    const h = window.__head;
    h.camera.position.set(0.9, 1.62, 0);
    h.camera.lookAt(0, 1.62, 0);
    h.controls.target.set(0, 1.62, 0);
    h.controls.update();
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: `${outPrefix}_side.png` });
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });

  await capture(page, "avatar_v12.glb", "phase31_v12");
  await capture(page, "avatar_v17.glb", "phase31_v17");

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

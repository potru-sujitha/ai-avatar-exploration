const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v10.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  // zoom the THREE.js camera itself directly closer rather than TalkingHead's setView presets
  await page.evaluate(() => {
    const h = window.__head;
    h.camera.position.z *= 0.35;
    h.camera.updateProjectionMatrix();
    h.controls.target.y += 0.02;
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: "phase18_eye_closeup.png" });
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

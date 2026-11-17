const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 700 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v17.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 100; i++) {
    const ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 150));
  }
  const before = await page.evaluate(() => ({x:window.__head.camera.position.x, y:window.__head.camera.position.y, z:window.__head.camera.position.z}));
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: -0.3, cameraY: 0.56, cameraX: 0, cameraRotateY: 0.6 }); });
  await new Promise(r=>setTimeout(r, 1500));
  const after = await page.evaluate(() => ({x:window.__head.camera.position.x, y:window.__head.camera.position.y, z:window.__head.camera.position.z, clock: window.__head.cameraClock}));
  console.log("before", before);
  console.log("after", after);
  await browser.close();
})();

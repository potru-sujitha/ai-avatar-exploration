const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });

  async function shot(avatarFile, outName) {
    await page.goto(`http://localhost:8924/phase20-demo.html?avatar=./${avatarFile}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    let ready = false;
    for (let i = 0; i < 60; i++) {
      ready = await page.evaluate(() => window.__ready === true).catch(() => false);
      if (ready) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await new Promise((r) => setTimeout(r, 300));
    await page.evaluate(() => {
      window.__head.setView('head', { cameraDistance: 1.0, cameraY: -2.2, cameraRotateX: -1.45 });
    });
    await new Promise((r) => setTimeout(r, 1300)); // let the 1000ms tween finish
    await page.screenshot({ path: outName });
  }

  await shot("avatar_v12.glb", "phase31_sv_top_v12.png");
  await shot("avatar_v17.glb", "phase31_sv_top_v17.png");
  await shot("avatar_v18_blend50_TEST.glb", "phase31_sv_top_blend50.png");

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });

  async function topShot(avatarFile, outName) {
    await page.goto(`http://localhost:8924/phase20-demo.html?avatar=./${avatarFile}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    let ready = false;
    for (let i = 0; i < 60; i++) {
      ready = await page.evaluate(() => window.__ready === true).catch(() => false);
      if (ready) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await new Promise((r) => setTimeout(r, 300));
    await page.evaluate(() => {
      const h = window.__head;
      h.camera.up.set(0, 0, -1);
      h.camera.position.set(0, 2.4, 0.01);
      h.camera.lookAt(0, 1.55, 0);
      h.controls.target.set(0, 1.55, 0);
      h.controls.update();
    });
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: outName });
    // restore up vector for any subsequent shot in this page instance
    await page.evaluate(() => { window.__head.camera.up.set(0,1,0); });
  }

  await topShot("avatar_v12.glb", "phase31_true_top_v12.png");
  await topShot("avatar_v17.glb", "phase31_true_top_v17.png");
  await topShot("avatar_v18_blend50_TEST.glb", "phase31_true_top_blend50.png");

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

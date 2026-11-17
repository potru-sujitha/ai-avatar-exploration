const puppeteer = require("puppeteer");

async function orbitTo(page, angleDeg, elevDeg = 0) {
  return page.evaluate((deg, elev) => {
    const h = window.__head;
    const target = h.controls.target;
    const cam = h.camera;
    const offset = cam.position.clone().sub(target);
    const radius = Math.sqrt(offset.x * offset.x + offset.z * offset.z + offset.y * offset.y);
    const rad = deg * Math.PI / 180;
    const elevRad = elev * Math.PI / 180;
    const horizR = radius * Math.cos(elevRad);
    cam.position.x = target.x + horizR * Math.sin(rad);
    cam.position.z = target.z + horizR * Math.cos(rad);
    cam.position.y = target.y + radius * Math.sin(elevRad);
    cam.lookAt(target);
    h.controls.update();
    return "ok";
  }, angleDeg, elevDeg);
}

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
    await orbitTo(page, 0, 75);
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: outName });
  }

  await shot("avatar_v12.glb", "phase31_proper_top_v12.png");
  await shot("avatar_v17.glb", "phase31_proper_top_v17.png");
  await shot("avatar_v18_blend50_TEST.glb", "phase31_proper_top_blend50.png");

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

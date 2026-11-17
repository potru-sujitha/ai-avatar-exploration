const puppeteer = require("puppeteer");

async function capture(page, avatarFile, prefix) {
  await page.goto(`http://localhost:8924/phase20-demo.html?avatar=./${avatarFile}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!ready) { console.log("NOT READY for", avatarFile); return; }

  async function setCameraOrbit(azimuthDeg, elevationDeg, dist) {
    await page.evaluate((az, el, d) => {
      const h = window.__head;
      const azr = az * Math.PI / 180, elr = el * Math.PI / 180;
      const target = h.controls.target;
      const x = target.x + d * Math.cos(elr) * Math.sin(azr);
      const y = target.y + d * Math.sin(elr);
      const z = target.z + d * Math.cos(elr) * Math.cos(azr);
      h.camera.position.set(x, y, z);
      h.camera.lookAt(target);
      h.cameraClock = null;
    }, azimuthDeg, elevationDeg, dist);
    await new Promise((r) => setTimeout(r, 300));
  }

  const dist = await page.evaluate(() => window.__head.camera.position.distanceTo(window.__head.controls.target));
  const views = [["top", 0, 75], ["threequarter", 40, 10], ["side_left", 90, 0]];
  for (const [name, az, el] of views) {
    await setCameraOrbit(az, el, dist);
    await page.screenshot({ path: `${prefix}_${name}.png` });
    console.log("captured", prefix, name);
  }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await capture(page, "avatar_v12.glb", "phase28_cmp_baseline");
  await capture(page, "avatar_v16_test_feathered.glb", "phase28_cmp_feathered");
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

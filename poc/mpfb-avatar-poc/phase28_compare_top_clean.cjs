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

  // Immediately orbit to top, minimal idle-sway accumulation time.
  await page.evaluate(() => {
    const h = window.__head;
    const target = h.controls.target;
    const dist = h.camera.position.distanceTo(target);
    const elr = 75 * Math.PI / 180;
    h.camera.position.set(target.x, target.y + dist * Math.sin(elr), target.z + dist * Math.cos(elr));
    h.camera.lookAt(target);
    h.cameraClock = null;
    // Also zero out any idle body sway so both captures share the same reference pose.
    if (h.poseDelta && h.poseDelta.props) {
      for (const k of ['Hips.quaternion','Spine.quaternion','Spine1.quaternion']) {
        if (h.poseDelta.props[k] && h.poseDelta.props[k].set) h.poseDelta.props[k].set(0,0,0,1);
      }
    }
  });
  await new Promise((r) => setTimeout(r, 150));
  await page.screenshot({ path: `${prefix}_top_clean.png` });
  console.log("captured", prefix);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await capture(page, "avatar_v12.glb", "phase28_clean_baseline");
  await capture(page, "avatar_v16_test_feathered.glb", "phase28_clean_feathered");
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

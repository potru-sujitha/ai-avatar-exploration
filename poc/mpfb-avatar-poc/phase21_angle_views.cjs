const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase21-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);
  await new Promise((r) => setTimeout(r, 1000));

  // Directly orbit the camera around the OrbitControls target using Three.js math,
  // bypassing simulated mouse-drag events entirely (Phase 15 found drag-event simulation
  // unreliable in headless Puppeteer -- this sidesteps that failure mode rather than
  // repeating it).
  async function orbitTo(angleDeg) {
    const result = await page.evaluate((deg) => {
      const h = window.__head;
      if (!h.controls || !h.camera) return "no controls/camera";
      const target = h.controls.target;
      const cam = h.camera;
      const offset = cam.position.clone().sub(target);
      const radius = Math.sqrt(offset.x * offset.x + offset.z * offset.z);
      const rad = deg * Math.PI / 180;
      cam.position.x = target.x + radius * Math.sin(rad);
      cam.position.z = target.z + radius * Math.cos(rad);
      cam.lookAt(target);
      h.controls.update();
      return "ok, camera now at x=" + cam.position.x.toFixed(3) + " z=" + cam.position.z.toFixed(3);
    }, angleDeg);
    return result;
  }

  console.log("three-quarter (35deg):", await orbitTo(35));
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase21_view2_threequarter.png" });

  console.log("side (80deg):", await orbitTo(80));
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase21_view3_side.png" });

  // return to front for sanity
  console.log("back to front (0deg):", await orbitTo(0));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

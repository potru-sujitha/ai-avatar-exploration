const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v20_candidate.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);
  await page.evaluate(() => { const p = document.getElementById('panel'); if (p) p.style.display = 'none'; });
  await page.evaluate(() => window.__head.setView('head', { cameraDistance: 0.1, cameraY: 0.1, cameraX: 0 }));
  await new Promise((r) => setTimeout(r, 500));

  async function orbitTo(angleDeg) {
    return await page.evaluate((deg) => {
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
      return "ok x=" + cam.position.x.toFixed(3) + " z=" + cam.position.z.toFixed(3);
    }, angleDeg);
  }

  console.log("front (0deg):", await orbitTo(0));
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase40_v20_front.png" });

  console.log("three-quarter (35deg):", await orbitTo(35));
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase40_v20_threequarter.png" });

  console.log("side (80deg):", await orbitTo(80));
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase40_v20_side.png" });

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

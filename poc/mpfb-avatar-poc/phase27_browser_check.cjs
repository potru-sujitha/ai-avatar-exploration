const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ width: 940, height: 760 });
  const avatarFile = process.argv[2] || "avatar_v15_stage.glb";
  const prefix = process.argv[3] || "phase27";
  await page.goto(`http://localhost:8924/phase26-demo.html?avatar=./${avatarFile}`, { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
  console.log("ready:", ready, "| status:", status);

  // Direct camera-orbit-math technique (Phase 21/26) for angled/top/back views.
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
      h.cameraClock = null; // skip any in-flight tween
    }, azimuthDeg, elevationDeg, dist);
    await new Promise((r) => setTimeout(r, 300));
  }

  const dist = await page.evaluate(() => window.__head.camera.position.distanceTo(window.__head.controls.target));

  const views = [
    ["front", 0, 0],
    ["threequarter", 40, 10],
    ["side_left", 90, 0],
    ["side_right", -90, 0],
    ["back", 180, 10],
    ["top", 0, 80],
  ];
  for (const [name, az, el] of views) {
    await setCameraOrbit(az, el, dist);
    await page.screenshot({ path: `${prefix}_view_${name}.png` });
    console.log("captured", name);
  }
  // head-and-shoulders = reset to default
  await page.evaluate(() => { window.__head.cameraClock = null; });
  await page.evaluate(() => {
    const h = window.__head;
    h.setView ? h.setView('head') : null;
  });
  await new Promise((r) => setTimeout(r, 1300));
  await page.screenshot({ path: `${prefix}_view_headshoulders.png` });
  console.log("captured headshoulders");

  // Performance check: animClock vs real-time drift (Phase 21/25/26 method)
  const t0 = await page.evaluate(() => window.__head.animClock);
  const realStart = Date.now();
  await new Promise((r) => setTimeout(r, 2000));
  const t1 = await page.evaluate(() => window.__head.animClock);
  const realElapsed = Date.now() - realStart;
  const animElapsed = t1 - t0;
  console.log(`PERF: animClock advanced ${animElapsed.toFixed(0)}ms over ${realElapsed}ms real time (ratio ${(animElapsed/realElapsed).toFixed(2)}x)`);

  console.log("page errors:", errors.length);
  errors.forEach((e) => console.log(e));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

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
  await page.goto("http://localhost:8924/phase26-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);
  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
  console.log("status:", status);
  console.log("errors so far:", errors.length, errors.join(" | "));

  async function orbitTo(angleDeg, elevDeg = 0) {
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

  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: "phase26_v1_front.png" });
  console.log("captured: front");

  await orbitTo(0, 75);
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase26_v2_top.png" });
  console.log("captured: top");
  await orbitTo(0, 0);

  await orbitTo(-80);
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase26_v3_left_side.png" });
  console.log("captured: left side");

  await orbitTo(80);
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase26_v4_right_side.png" });
  console.log("captured: right side");

  await orbitTo(35);
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase26_v5_threequarter.png" });
  console.log("captured: three-quarter");

  await orbitTo(180);
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase26_v6_back.png" });
  console.log("captured: back");

  await orbitTo(0);
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase26_v7_headshoulders.png" });
  console.log("captured: head-and-shoulders (front, same as v1 framing)");

  // Performance check: animClock vs real-time drift, Phase 21's technique
  const perfStart = await page.evaluate(() => window.__head.animClock);
  const t0 = Date.now();
  await new Promise((r) => setTimeout(r, 2000));
  const perfEnd = await page.evaluate(() => window.__head.animClock);
  const realMs = Date.now() - t0;
  console.log(`PERF: animClock advanced ${(perfEnd - perfStart).toFixed(0)}ms during ${realMs}ms real time (ratio=${((perfEnd-perfStart)/realMs).toFixed(2)}, ~${(30*(perfEnd-perfStart)/realMs).toFixed(1)}fps-equivalent at 30fps baseline)`);

  // mid-speech
  await page.click('#play').catch(e => errors.push("play click failed: " + e.message));
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: "phase26_v8_midspeech.png" });
  console.log("captured: mid-speech");
  await new Promise((r) => setTimeout(r, 2500));
  await page.click('#stop').catch(() => {});

  // Regression: visemes/morphs already in status. Blink over 20s.
  let blinkMax = 0;
  for (let i = 0; i < 20; i++) {
    const v = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft') || 0);
    if (v > blinkMax) blinkMax = v;
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log("REGRESSION blink max over 20s:", blinkMax.toFixed(3));

  // gaze up/down
  await page.evaluate(() => window.__head.lookAt(470, 50, 1200));
  await new Promise((r) => setTimeout(r, 1300));
  const gazeUp = await page.evaluate(() => window.__head.getValue('eyesLookUp') || 0);
  await page.evaluate(() => window.__head.lookAt(470, 700, 1200));
  await new Promise((r) => setTimeout(r, 1300));
  const gazeDown = await page.evaluate(() => window.__head.getValue('eyesLookDown') || 0);
  console.log("REGRESSION gaze up:", gazeUp.toFixed(3), "gaze down:", gazeDown.toFixed(3));
  await page.evaluate(() => window.__head.setMood('neutral'));

  // moods
  for (const mood of ['happy', 'sad', 'fear']) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise((r) => setTimeout(r, 4000));
    const val = await page.evaluate(() => window.__head.getValue('mouthSmile') + '|' + window.__head.getValue('mouthFrownLeft') + '|' + window.__head.getValue('browInnerUp'));
    console.log(`REGRESSION mood ${mood}: mouthSmile|mouthFrownLeft|browInnerUp = ${val}`);
  }

  console.log("TOTAL ERRORS:", errors.length);
  errors.forEach(e => console.log("ERR:", e));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

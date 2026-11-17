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
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v16.glb", { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);
  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
  console.log("status:", status);

  // --- Views: front, head-and-shoulders (default), three-quarter, side, back, top ---
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
    await new Promise((r) => setTimeout(r, 250));
  }
  const dist = await page.evaluate(() => window.__head.camera.position.distanceTo(window.__head.controls.target));
  await page.screenshot({ path: "phase28_v16_view_headshoulders.png" });
  await setCameraOrbit(0, 0, dist);
  await page.screenshot({ path: "phase28_v16_view_front.png" });
  await setCameraOrbit(40, 10, dist);
  await page.screenshot({ path: "phase28_v16_view_threequarter.png" });
  await setCameraOrbit(90, 0, dist);
  await page.screenshot({ path: "phase28_v16_view_side.png" });
  await setCameraOrbit(180, 10, dist);
  await page.screenshot({ path: "phase28_v16_view_back.png" });
  await setCameraOrbit(0, 75, dist);
  await page.screenshot({ path: "phase28_v16_view_top.png" });
  await setCameraOrbit(0, 0, dist); // reset for the rest

  // --- Lip-sync (isolated, dense sample) ---
  await page.click('#play').catch(()=>{});
  let peakViseme = 0;
  for (let i = 0; i < 20; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      return Math.max(...["viseme_aa","viseme_PP","viseme_O","viseme_E","viseme_RR","viseme_nn"].map(n => h.getValue(n) || 0));
    });
    peakViseme = Math.max(peakViseme, v);
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log("lipsync_peak:", peakViseme);
  await page.screenshot({ path: "phase28_v16_view_midspeech.png" });
  await page.evaluate(() => window.__head.streamStop && window.__head.streamStop());

  // --- Blink (20s window) ---
  let blinkMax = 0;
  const blinkStart = Date.now();
  while (Date.now() - blinkStart < 20000) {
    const b = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft') || 0);
    blinkMax = Math.max(blinkMax, b);
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log("blink_max_20s:", blinkMax);

  // --- Gaze up/down ---
  await page.click('#lookUp').catch(()=>{});
  await new Promise((r) => setTimeout(r, 1300));
  const gazeUp = await page.evaluate(() => window.__head.getValue('eyesLookUp') || 0);
  await page.click('#lookDown').catch(()=>{});
  await new Promise((r) => setTimeout(r, 1300));
  const gazeDown = await page.evaluate(() => window.__head.getValue('eyesLookDown') || 0);
  console.log("gaze_up:", gazeUp, "gaze_down:", gazeDown);
  await page.click('#lookCenter').catch(()=>{});

  // --- Moods, with real settle time ---
  for (const mood of ["happy","sad","fear"]) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise((r) => setTimeout(r, 4000));
    const vals = await page.evaluate(() => {
      const h = window.__head;
      return { mouthSmile: h.getValue('mouthSmile'), mouthFrownLeft: h.getValue('mouthFrownLeft'), browInnerUp: h.getValue('browInnerUp') };
    });
    console.log("mood", mood, JSON.stringify(vals));
  }
  await page.evaluate(() => window.__head.setMood('neutral'));

  console.log("errors:", errors.length);
  errors.slice(0,5).forEach(e => console.log(e));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase19-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log("ready:", ready);
  console.log("errors so far:", errors.length, errors.join(" | "));

  // Let smile baseline + idle settle a bit before any screenshot for fair comparison.
  await new Promise((r) => setTimeout(r, 1500));

  await page.screenshot({ path: "phase19_baseline_off.png" });
  console.log("captured baseline (both OFF)");

  // Eye-only
  await page.click('#eyeOn');
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: "phase19_eye_only.png" });
  console.log("captured eye-only");
  await page.click('#eyeOff');
  await new Promise((r) => setTimeout(r, 300));

  // Skin-only
  await page.click('#skinOn');
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: "phase19_skin_only.png" });
  console.log("captured skin-only");

  // Combined (skin still on, add eye)
  await page.click('#eyeOn');
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: "phase19_combined.png" });
  console.log("captured combined");

  // Performance: measure frame time over ~2s with both effects ON vs OFF
  async function measureFPS(ms) {
    return await page.evaluate((duration) => new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function tick() {
        frames++;
        if (performance.now() - start < duration) requestAnimationFrame(tick);
        else resolve({ frames, ms: performance.now() - start, fps: frames / ((performance.now() - start) / 1000) });
      }
      requestAnimationFrame(tick);
    }), ms);
  }
  const fpsWithEffects = await measureFPS(2000);
  console.log("FPS with both effects ON:", JSON.stringify(fpsWithEffects));

  await page.click('#eyeOff');
  await page.click('#skinOff');
  await new Promise((r) => setTimeout(r, 300));
  const fpsBaseline = await measureFPS(2000);
  console.log("FPS baseline (both OFF):", JSON.stringify(fpsBaseline));

  // Re-enable both for animation regression testing
  await page.click('#eyeOn');
  await page.click('#skinOn');
  await new Promise((r) => setTimeout(r, 300));

  // Animation regression with both effects active
  console.log("\n=== Animation regression with both Phase 19 effects ON ===");

  // Lip-sync: play audio, sample across multiple viseme morphs
  await page.click('#play');
  await new Promise((r) => setTimeout(r, 700));
  const lipSync = await page.evaluate(() => {
    const h = window.__head;
    const names = ['viseme_aa','viseme_E','viseme_O','viseme_I','viseme_U','viseme_PP','viseme_SS','viseme_kk'];
    return Object.fromEntries(names.map(n => [n, h.getValue(n)]));
  });
  console.log("lip-sync samples mid-speech:", JSON.stringify(lipSync));
  const lipPeak = Math.max(...Object.values(lipSync).map(v => v || 0));
  console.log("lip-sync peak:", lipPeak, lipPeak > 0.05 ? "VERIFIED" : "SUSPECT - check manually");
  await new Promise((r) => setTimeout(r, 2000));
  await page.click('#stop').catch(() => {});

  // Blink over 20s
  console.log("sampling blink over 20s...");
  const blinkSamples = [];
  for (let i = 0; i < 80; i++) {
    const v = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft'));
    blinkSamples.push(v);
    await new Promise((r) => setTimeout(r, 250));
  }
  const blinkMax = Math.max(...blinkSamples);
  console.log("blink max over 20s:", blinkMax, blinkMax > 0.5 ? "VERIFIED" : "SUSPECT");

  // Gaze down
  await page.click('#lookDown');
  await new Promise((r) => setTimeout(r, 1300));
  const gazeDown = await page.evaluate(() => window.__head.getValue('eyesLookDown'));
  console.log("gaze down:", gazeDown);
  await page.click('#lookCenter');
  await new Promise((r) => setTimeout(r, 1000));

  // Moods
  for (const mood of ['happy', 'sad', 'fear']) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise((r) => setTimeout(r, 3000));
    const vals = await page.evaluate(() => {
      const h = window.__head;
      return { mouthSmile: h.getValue('mouthSmile'), mouthFrownLeft: h.getValue('mouthFrownLeft'), eyeWideLeft: h.getValue('eyeWideLeft') };
    });
    console.log(mood, "mood values:", JSON.stringify(vals));
  }
  await page.evaluate(() => window.__head.setMood('neutral'));

  console.log("\ntotal errors:", errors.length);
  errors.forEach(e => console.log("  " + e));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

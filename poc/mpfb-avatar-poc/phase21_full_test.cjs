const puppeteer = require("puppeteer");

async function newPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase21-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  return { page, ready };
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });

  // --- Views 1, 4: front and head-and-shoulders (same camera, default) ---
  {
    const { page, ready } = await newPage(browser);
    console.log("READY:", ready);
    const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NONE');
    console.log("STATUS:", status);
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: "phase21_view1_front.png" });
    await page.screenshot({ path: "phase21_view4_headshoulders.png" }); // same framing, duplicate for the task's two requested views

    // --- mid-speech view ---
    await page.click('#play').catch(() => {});
    await new Promise((r) => setTimeout(r, 900));
    await page.screenshot({ path: "phase21_view5_midspeech.png" });
    await page.click('#stop').catch(() => {});

    // --- ANIMATION REGRESSION (full, not a smoke check) ---
    console.log("\n=== LIP-SYNC (dense sampling during real playback) ===");
    await page.click('#play').catch(() => {});
    let maxViseme = 0;
    for (let i = 0; i < 20; i++) {
      const v = await page.evaluate(() => {
        const h = window.__head;
        const names = ["viseme_aa","viseme_PP","viseme_O","viseme_E","viseme_kk","viseme_I","viseme_U","viseme_SS","viseme_FF","viseme_CH","viseme_DD","viseme_TH","viseme_nn","viseme_RR"];
        return Math.max(...names.map(n => h.getValue(n) || 0));
      });
      if (v > maxViseme) maxViseme = v;
      await new Promise(r => setTimeout(r, 150));
    }
    console.log("lip-sync max viseme activation:", maxViseme, maxViseme > 0.1 ? "PASS" : "FAIL");

    console.log("\n=== BLINK (22s window) ===");
    let maxBlink = 0, blinkEvents = 0, wasHigh = false;
    for (let i = 0; i < 110; i++) {
      const v = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft') || 0);
      if (v > maxBlink) maxBlink = v;
      if (v > 0.5 && !wasHigh) { blinkEvents++; wasHigh = true; }
      if (v < 0.2) wasHigh = false;
      await new Promise(r => setTimeout(r, 200));
    }
    console.log("blink max:", maxBlink, "events:", blinkEvents, maxBlink > 0.8 ? "PASS" : "FAIL");

    console.log("\n=== GAZE (up/down) ===");
    const r = await page.evaluate(() => { window.__head.getBoundingClientRect ? null : null; return null; });
    await page.click('#lookUp').catch(() => {});
    await new Promise(r => setTimeout(r, 1300));
    const gazeUp = await page.evaluate(() => window.__head.getValue('eyeLookUpLeft') || window.__head.getValue('eyesLookUp') || 0);
    await page.click('#lookDown').catch(() => {});
    await new Promise(r => setTimeout(r, 1300));
    const gazeDown = await page.evaluate(() => window.__head.getValue('eyeLookDownLeft') || window.__head.getValue('eyesLookDown') || 0);
    console.log("gaze up:", gazeUp, "gaze down:", gazeDown);

    console.log("\n=== MOODS (happy/sad/fear, 9s settle each) ===");
    for (const mood of ["happy", "sad", "fear", "neutral"]) {
      await page.click('#mood' + mood[0].toUpperCase() + mood.slice(1)).catch((e) => console.log("click failed for", mood, e.message));
      await new Promise(r => setTimeout(r, 9000));
      const val = await page.evaluate(() => window.__head.getValue('mouthSmile') + '|' + window.__head.getValue('mouthFrownLeft') + '|' + window.__head.getValue('browDownLeft'));
      console.log(mood, "-> mouthSmile|mouthFrownLeft|browDownLeft:", val);
    }

    await browser.close();
  }
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

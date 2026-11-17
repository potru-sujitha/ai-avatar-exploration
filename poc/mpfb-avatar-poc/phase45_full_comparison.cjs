const puppeteer = require("puppeteer");

// Phase 45 - multi-angle v17 vs v19_candidate comparison.
// Read-only: loads existing GLBs over HTTP, never writes to any GLB.

const SHOTS = [
  {
    key: "front_full",
    label: "1. Front-facing full head and shoulders",
    viewport: { width: 1000, height: 900 },
    view: "upper",
    opt: { cameraDistance: -0.1, cameraY: 0.42, cameraX: 0 },
  },
  {
    key: "hairline_macro",
    label: "2. Close-up of centre part and hairline",
    viewport: { width: 1600, height: 1200 },
    view: "head",
    opt: { cameraDistance: -0.1, cameraY: 0.56, cameraX: 0 },
  },
  {
    key: "temple_left",
    label: "3a. Left temple region",
    viewport: { width: 1200, height: 1000 },
    view: "head",
    opt: { cameraDistance: -0.3, cameraY: 0.56, cameraX: 0, cameraRotateY: 0.6 },
  },
  {
    key: "temple_right",
    label: "3b. Right temple region",
    viewport: { width: 1200, height: 1000 },
    view: "head",
    opt: { cameraDistance: -0.3, cameraY: 0.56, cameraX: 0, cameraRotateY: -0.6 },
  },
  {
    key: "top_front_coverage",
    label: "4. Top/front hair coverage",
    viewport: { width: 1200, height: 1000 },
    view: "head",
    opt: { cameraDistance: -0.35, cameraY: 0.82, cameraX: 0, cameraRotateX: -0.35 },
  },
  {
    key: "shoulder_fleck",
    label: "5. Shoulder area (known fleck defect), Phase 17 framing",
    viewport: { width: 900, height: 900 },
    view: "head",
    opt: { cameraDistance: 0.5, cameraY: 0.3, cameraX: 0.25 },
  },
];

async function captureAll(avatarFile, tag) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const results = [];
  for (const shot of SHOTS) {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push("[console.error] " + m.text()); });
    page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
    await page.setViewport(shot.viewport);
    await page.goto(`http://localhost:8924/phase20-demo.html?avatar=./${avatarFile}`, { waitUntil: "domcontentloaded", timeout: 30000 });

    let ready = false;
    for (let i = 0; i < 100; i++) {
      ready = await page.evaluate(() => window.__ready === true).catch(() => false);
      if (ready) break;
      await new Promise((r) => setTimeout(r, 150));
    }

    await page.evaluate((opt, view) => {
      const panel = document.getElementById('panel');
      if (panel) panel.style.display = 'none';
      if (window.__head && typeof window.__head.setView === 'function') {
        window.__head.setView(view, opt);
      }
    }, shot.opt, shot.view).catch((e) => errors.push("[evalerr] " + e.message));

    // The camera setView() transition is driven by rAF-measured dt, which is
    // heavily throttled and INCONSISTENTLY throttled in this headless tab
    // context (a fixed wall-clock wait left cameraClock anywhere from ~240
    // to 1000 out of a required 1000 across different shots - confirmed by
    // a first attempt at this capture). Poll the actual clock value instead
    // of guessing a wait, so every screenshot is taken only once the camera
    // transition has genuinely finished for both avatars alike.
    let clockVal = 0;
    for (let i = 0; i < 400; i++) {
      clockVal = await page.evaluate(() => window.__head ? window.__head.cameraClock : 1000).catch(() => 1000);
      if (clockVal === null || clockVal >= 999) break;
      await new Promise((r) => setTimeout(r, 250));
    }

    const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS').catch(() => 'ERR');
    const outPng = `phase45_${tag}_${shot.key}.png`;
    await page.screenshot({ path: outPng });

    results.push({ shot: shot.key, label: shot.label, outPng, ready, status, cameraClock: clockVal, errorCount: errors.length, errors });
    await page.close();
  }
  await browser.close();
  return results;
}

(async () => {
  const v17 = await captureAll("avatar_v17.glb", "v17");
  const v19 = await captureAll("avatar_v19_candidate.glb", "v19");

  console.log(JSON.stringify({ v17, v19 }, null, 1));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

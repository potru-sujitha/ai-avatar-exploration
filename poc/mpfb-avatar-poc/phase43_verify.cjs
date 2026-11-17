const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required',
      '--window-size=900,900',
    ],
    defaultViewport: { width: 900, height: 900 },
  });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  page.on('console', msg => console.log('PAGE:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  const url = 'http://localhost:8924/phase20-demo.html?avatar=avatar_v21_candidate.glb';
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction('window.__ready === true', { timeout: 30000 });

  const status = await page.evaluate(() => ({
    url: location.href,
    visemeCount: window.__visemeCount,
    arkitCount: window.__arkitCount,
    loadError: window.__loadError || null,
  }));
  console.log('STATUS:', JSON.stringify(status));

  await page.evaluate(() => { document.getElementById('panel').style.display = 'none'; });

  const outDir = path.join(__dirname, 'phase43_screenshots');
  require('fs').mkdirSync(outDir, { recursive: true });

  async function shot(name, viewOpts) {
    await page.evaluate((opts) => { window.__head.setView('head', opts); }, viewOpts);
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(outDir, name) });
    console.log('captured', name);
  }

  // 7 requested views, built on the established revealing head-framing convention
  await shot('01_front_close.png',        { cameraDistance: -0.42, cameraY: 0.56, cameraX: 0 });
  await shot('02_full_front.png',         { cameraDistance: 0.6,   cameraY: 0.1,  cameraX: 0 });
  await shot('03_three_quarter_left.png', { cameraDistance: 0.0,   cameraY: 0.4,  cameraX: -0.5 });
  await shot('04_three_quarter_right.png',{ cameraDistance: 0.0,   cameraY: 0.4,  cameraX: 0.5 });
  await shot('05_side.png',               { cameraDistance: 0.0,   cameraY: 0.4,  cameraX: 1.0 });

  // neutral pose
  await page.evaluate(() => { window.__head.setMood('neutral'); window.__head.lookAt(null, null, 500); });
  await new Promise(r => setTimeout(r, 1500));
  await shot('06_neutral_pose.png', { cameraDistance: 0.1, cameraY: 0.35, cameraX: 0 });

  // speaking pose -- trigger actual streamAudio via the page's own test button if present, else just capture mid-viseme state
  const hasSpeakBtn = await page.evaluate(() => !!document.getElementById('speak'));
  if (hasSpeakBtn) {
    await page.click('#speak');
    await new Promise(r => setTimeout(r, 600));
  }
  await shot('07_speaking_pose.png', { cameraDistance: -0.1, cameraY: 0.45, cameraX: 0 });

  // --- animation / regression checks ---
  const regress = await page.evaluate(async () => {
    const head = window.__head;
    const result = {};
    result.morphCount = Object.keys(head.morphs || head.avatar?.morphTargetDictionary || {}).length || window.__arkitCount;
    // blink over a real window
    const blinkStart = Date.now();
    let blinkMax = 0;
    await new Promise(resolve => {
      const iv = setInterval(() => {
        try {
          const v = head.getValue ? head.getValue('eyeBlinkLeft') : null;
          if (typeof v === 'number' && v > blinkMax) blinkMax = v;
        } catch (e) {}
        if (Date.now() - blinkStart > 8000) { clearInterval(iv); resolve(); }
      }, 200);
    });
    result.blinkMaxSampledOver8s = blinkMax;

    // moods
    const moodResults = {};
    for (const m of ['happy', 'sad', 'fear']) {
      head.setMood(m);
      await new Promise(r => setTimeout(r, 3000));
      moodResults[m] = 'set, no error';
    }
    head.setMood('neutral');
    result.moods = moodResults;

    // gaze
    try {
      head.lookAt(100, 100, 1000);
      await new Promise(r => setTimeout(r, 500));
      result.gazeCallOk = true;
    } catch (e) { result.gazeCallOk = false; result.gazeError = e.message; }

    return result;
  });
  console.log('REGRESSION:', JSON.stringify(regress));

  await browser.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });

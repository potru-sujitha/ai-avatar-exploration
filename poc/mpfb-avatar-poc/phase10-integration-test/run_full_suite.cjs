const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const LAUNCH_ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
  "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function waitReady(page, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ready = await page.evaluate(() => window.__ready === true);
    if (ready) return true;
    await sleep(250);
  }
  return false;
}

async function testEngine(browser, engineFile, label, shotPrefix) {
  const out = { label, engineFile };
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ width: 940, height: 760 });

  // --- A. GLB compatibility (load + counts) ---
  await page.goto(`http://localhost:8924/phase10-integration-test/${engineFile}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const ready = await waitReady(page);
  out.loaded = ready;
  if (!ready) { out.loadErrors = errors; await page.close(); return out; }
  out.loadTimeMs = await page.evaluate(() => window.__loadTimeMs);
  out.visemeCount = await page.evaluate(() => window.__visemeCount);
  out.arkitCount = await page.evaluate(() => window.__arkitCount);
  out.pageErrors = errors.slice();

  await page.screenshot({ path: path.join(__dirname, `${shotPrefix}_neutral.png`) });

  // --- B. Lip-sync: default clip ---
  const lipsyncDefault = await runLipsyncTest(page, 3200);
  out.lipsync_default = lipsyncDefault;
  await page.screenshot({ path: path.join(__dirname, `${shotPrefix}_midspeech.png`) });

  // reload fresh page for each subsequent variant to avoid cross-test state bleed
  await page.close();

  async function freshPage(variant) {
    const p = await browser.newPage();
    p.on("pageerror", (e) => errors.push(`[${variant}] ` + e.message));
    await p.setViewport({ width: 940, height: 760 });
    await p.goto(`http://localhost:8924/phase10-integration-test/${engineFile}?variant=${variant}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitReady(p);
    return p;
  }

  async function runLipsyncTest(p, waitMs) {
    const before = await p.evaluate(() => window.__head.getValue("viseme_aa"));
    await p.evaluate(() => window.__playTimeline());
    const samples = [];
    const steps = Math.ceil(waitMs / 150);
    for (let i = 0; i < steps; i++) {
      await sleep(150);
      const v = await p.evaluate(() => {
        const h = window.__head;
        const names = ["viseme_aa", "viseme_PP", "viseme_O", "viseme_E", "viseme_kk"];
        return { max: Math.max(...names.map((n) => h.getValue(n) || 0)), ended: window.__streamEnded === true };
      });
      samples.push(v.max);
      if (v.ended && i > 2) break;
    }
    const maxVal = Math.max(...samples);
    const anyNaN = samples.some((s) => Number.isNaN(s));
    const stuckAtEnd = samples.length > 4 && samples.slice(-3).every((s) => s === samples[samples.length - 4]) && samples[samples.length - 1] > 0.3;
    return { before, maxVal, sampleCount: samples.length, anyNaN, stuckAtEnd, lastVal: samples[samples.length - 1] };
  }

  // short
  const pShort = await freshPage("short");
  out.lipsync_short = await runLipsyncTest(pShort, 1500);
  await pShort.close();

  // continuous (9s real audio, 3x looped real clip)
  const pCont = await freshPage("continuous");
  out.lipsync_continuous = await runLipsyncTest(pCont, 9500);
  await pCont.close();

  // paused (clip + 800ms silence + clip)
  const pPause = await freshPage("paused");
  out.lipsync_paused = await runLipsyncTest(pPause, 7200);
  await pPause.close();

  out.lipsync_question = "NOT TESTED — no suitable real-audio fixture with question intonation available";
  out.lipsync_speed = "NOT TESTED — no suitable real-audio fixture for a genuine speed variation (resampling changes pitch; manual morph assignment forbidden by task)";

  // --- C. Blink (22s observation) ---
  const pBlink = await freshPage("default");
  const blinkSamples = [];
  for (let i = 0; i < 110; i++) { // 110 * 200ms = 22s
    const v = await pBlink.evaluate(() => window.__head.getValue("eyeBlinkLeft"));
    blinkSamples.push(v || 0);
    await sleep(200);
  }
  const maxBlink = Math.max(...blinkSamples);
  const framesAboveHalf = blinkSamples.filter((v) => v > 0.5).length;
  const stuckClosed = blinkSamples.slice(-10).every((v) => v > 0.5); // last 2s all closed?
  out.blink = { maxBlink, framesAboveHalf, totalFrames: blinkSamples.length, stuckClosed };
  await pBlink.close();

  // --- D. Idle gaze: multiple independent sessions ---
  const gazeRuns = [];
  for (let run = 0; run < 3; run++) {
    const pGaze = await freshPage("default");
    const trials = [];
    for (let t = 0; t < 8; t++) {
      await sleep(600);
      const v = await pGaze.evaluate(() => ({
        down: window.__head.getValue("eyesLookDown") || 0,
        up: window.__head.getValue("eyesLookUp") || 0,
      }));
      trials.push(v);
    }
    const meanDown = trials.reduce((a, t) => a + t.down, 0) / trials.length;
    const meanUp = trials.reduce((a, t) => a + t.up, 0) / trials.length;
    const everUp = trials.some((t) => t.up > 0.01);
    gazeRuns.push({ meanDown, meanUp, everUp, trials });
    await pGaze.close();
  }
  out.idleGaze = { runs: gazeRuns };

  // --- E. Intentional lookAt() after idle already running ---
  const pLook = await freshPage("default");
  await sleep(4000); // let idle run for a while first
  const beforeLook = await pLook.evaluate(() => ({
    outLeft: window.__head.getValue("eyeLookOutLeft") || 0,
    inRight: window.__head.getValue("eyeLookInRight") || 0,
  }));
  await pLook.evaluate(() => { window.__head.lookAt(5, 380, 1500); });
  await sleep(1000);
  const duringLook = await pLook.evaluate(() => ({
    outLeft: window.__head.getValue("eyeLookOutLeft") || 0,
    inRight: window.__head.getValue("eyeLookInRight") || 0,
  }));
  await sleep(3000); // after the lookAt duration elapses, does it return to idle?
  const afterLook = await pLook.evaluate(() => ({
    outLeft: window.__head.getValue("eyeLookOutLeft") || 0,
    inRight: window.__head.getValue("eyeLookInRight") || 0,
  }));
  out.intentionalGaze = { beforeLook, duringLook, afterLook, reachedTarget: duringLook.outLeft > 0.15 && duringLook.inRight > 0.15, paired: Math.abs(duringLook.outLeft - duringLook.inRight) < 0.05 };
  await pLook.close();

  // --- F. Moods: happy, sad, fear ---
  const moodChecks = {
    happy: ["mouthSmile"],
    sad: ["mouthFrownLeft"],
    fear: ["browInnerUp"],
  };
  const moods = {};
  for (const [mood, keys] of Object.entries(moodChecks)) {
    const pMood = await freshPage("default");
    await pMood.evaluate((m) => { window.__head.setMood(m); }, mood);
    await sleep(2500);
    const vals = await pMood.evaluate((keys) => Object.fromEntries(keys.map((k) => [k, window.__head.getValue(k) || 0])), keys);
    // confirm mood doesn't break lip-sync/blink: quick check that streamStart still works
    await pMood.evaluate(() => window.__playTimeline());
    await sleep(600);
    const stillAnimating = await pMood.evaluate(() => {
      const names = ["viseme_aa", "viseme_PP", "viseme_O"];
      return Math.max(...names.map((n) => window.__head.getValue(n) || 0));
    });
    moods[mood] = { values: vals, lipsyncStillWorksDuringMood: stillAnimating >= 0 }; // >=0 just confirms no throw/NaN
    await pMood.close();
  }
  out.moods = moods;

  // --- Visual comparison screenshots: forward, down-idle-wait, up-idle-wait, blink-catch, mid-speech, moods ---
  const pVis = await freshPage("default");
  await pVis.screenshot({ path: path.join(__dirname, `${shotPrefix}_front_t0.png`) });
  await sleep(3000);
  await pVis.screenshot({ path: path.join(__dirname, `${shotPrefix}_front_idle3s.png`) });
  await pVis.evaluate(() => { window.__head.setMood('happy'); });
  await sleep(2500);
  await pVis.screenshot({ path: path.join(__dirname, `${shotPrefix}_happy.png`) });
  await pVis.evaluate(() => { window.__head.setMood('sad'); });
  await sleep(2500);
  await pVis.screenshot({ path: path.join(__dirname, `${shotPrefix}_sad.png`) });
  await pVis.evaluate(() => { window.__head.setMood('fear'); });
  await sleep(2500);
  await pVis.screenshot({ path: path.join(__dirname, `${shotPrefix}_fear.png`) });
  await pVis.close();

  out.pageErrorsFinal = errors;
  return out;
}

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: LAUNCH_ARGS });
  console.log("Testing ORIGINAL engine...");
  const originalResult = await testEngine(browser, "test_original.html", "original", "phase10_orig");
  console.log("Testing IDLE-GAZE-FIXED engine...");
  const fixedResult = await testEngine(browser, "test_idlegaze_fixed.html", "idlegaze_fixed", "phase10_fixed");
  await browser.close();

  fs.writeFileSync(path.join(__dirname, "phase10_results.json"), JSON.stringify({ originalResult, fixedResult }, null, 2));
  console.log("DONE. Results written to phase10_results.json");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

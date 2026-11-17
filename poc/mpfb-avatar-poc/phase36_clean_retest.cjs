const puppeteer = require("puppeteer");
const fs = require("fs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stats = (arr) => ({ min: Math.min(...arr), max: Math.max(...arr), mean: arr.reduce((a, b) => a + b, 0) / arr.length });

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v17.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await sleep(200);
  }
  console.log("ready:", ready);

  // --- CLEAN gaze-independence check: moderate target, not viewport-edge extreme ---
  const r = await page.evaluate(() => { const b = document.getElementById("avatar").getBoundingClientRect(); return { left: b.left, top: b.top, width: b.width, height: b.height }; });
  const before = await page.evaluate(() => ({ y: window.__head.getValue("bodyRotateY") || 0, gazeOutL: window.__head.getValue("eyeLookOutLeft") || 0, gazeOutR: window.__head.getValue("eyeLookOutRight") || 0 }));
  // moderate target: 1/3 of the way from center toward the left edge, not the literal edge
  const targetX = r.left + r.width * 0.5 - r.width * 0.33;
  await page.evaluate((tx, ty) => window.__head.lookAt(tx, ty, 1000), targetX, r.top + r.height * 0.4);
  await sleep(1300);
  const after = await page.evaluate(() => ({ y: window.__head.getValue("bodyRotateY") || 0, gazeOutL: window.__head.getValue("eyeLookOutLeft") || 0, gazeOutR: window.__head.getValue("eyeLookOutRight") || 0 }));
  console.log("CLEAN gaze check (moderate target, 1/3 toward left edge):");
  console.log("  before: bodyRotateY=" + before.y.toFixed(4) + " eyeLookOutLeft=" + before.gazeOutL.toFixed(3) + " eyeLookOutRight=" + before.gazeOutR.toFixed(3));
  console.log("  after:  bodyRotateY=" + after.y.toFixed(4) + " eyeLookOutLeft=" + after.gazeOutL.toFixed(3) + " eyeLookOutRight=" + after.gazeOutR.toFixed(3));
  await page.evaluate(() => window.__head.lookAt(null, null, 500));
  await sleep(2000); // let body fully settle back before the speaking test

  // --- CLEAN 25s speaking window, no preceding extreme lookAt contamination ---
  console.log("--- clean speaking window ---");
  const samples = [];
  const start = Date.now();
  let cycles = 0;
  while (Date.now() - start < 25000) {
    const playing = await page.evaluate(() => window.__head.isAudioPlaying === true || window.__head.isSpeaking === true);
    if (!playing) { await page.click("#play").catch(() => {}); cycles++; }
    const v = await page.evaluate(() => ({
      y: window.__head.getValue("bodyRotateY") || 0,
      x: window.__head.getValue("bodyRotateX") || 0,
      z: window.__head.getValue("bodyRotateZ") || 0,
      aa: window.__head.getValue("viseme_aa") || 0,
    }));
    samples.push(v);
    await sleep(250);
  }
  const y = samples.map(s => s.y), x = samples.map(s => s.x), z = samples.map(s => s.z);
  const sy = stats(y), sx = stats(x), sz = stats(z);
  console.log("CLEAN SPEAKING window: " + samples.length + " samples over 25s, " + cycles + " playback cycles");
  console.log("  bodyRotateY (yaw)  min/max/mean (rad):", sy.min.toFixed(4), sy.max.toFixed(4), sy.mean.toFixed(4));
  console.log("  bodyRotateY (yaw)  min/max (deg):", (sy.min * 180 / Math.PI).toFixed(2), (sy.max * 180 / Math.PI).toFixed(2));
  console.log("  bodyRotateX (pitch) min/max (rad):", sx.min.toFixed(4), sx.max.toFixed(4));
  console.log("  bodyRotateZ (roll)  min/max (rad):", sz.min.toFixed(4), sz.max.toFixed(4));
  console.log("  viseme peak:", Math.max(...samples.map(s => s.aa)).toFixed(3));
  await page.screenshot({ path: "phase36_clean_speaking_final.png" });

  fs.writeFileSync("phase36_clean_retest_data.json", JSON.stringify({ before, after, samples }, null, 1));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

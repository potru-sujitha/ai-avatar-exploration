const puppeteer = require("puppeteer");

async function measureMood(page, mood, seconds) {
  await page.evaluate((m) => window.__head.setMood(m), mood);
  await new Promise((r) => setTimeout(r, 500));
  let minY = 999, maxY = -999, minX = 999, maxX = -999, minZ = 999, maxZ = -999;
  const n = Math.round(seconds * 1000 / 250);
  for (let i = 0; i < n; i++) {
    const [y, x, z] = await page.evaluate(() => [
      window.__head.getValue('bodyRotateY') || 0,
      window.__head.getValue('bodyRotateX') || 0,
      window.__head.getValue('bodyRotateZ') || 0,
    ]);
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    await new Promise((r) => setTimeout(r, 250));
  }
  const toDeg = (r) => (r * 180 / Math.PI).toFixed(1);
  console.log(`${mood} idle (${seconds}s, ${n} samples): Y(yaw) ${toDeg(minY)} to ${toDeg(maxY)} deg | X(pitch) ${toDeg(minX)} to ${toDeg(maxX)} deg | Z(roll) ${toDeg(minZ)} to ${toDeg(maxZ)} deg`);
  return { minY, maxY, minX, maxX, minZ, maxZ };
}

async function measureTransition(page, mood) {
  await page.evaluate((m) => window.__head.setMood(m), mood);
  await new Promise((r) => setTimeout(r, 4000)); // let idle settle into a real wandering state
  await page.click('#play').catch(() => {});
  let minY = 999, maxY = -999;
  for (let i = 0; i < 16; i++) {
    const y = await page.evaluate(() => window.__head.getValue('bodyRotateY') || 0);
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    await new Promise((r) => setTimeout(r, 150));
  }
  const toDeg = (r) => (r * 180 / Math.PI).toFixed(1);
  console.log(`${mood} idle->speaking transition (2.4s after click): Y(yaw) ${toDeg(minY)} to ${toDeg(maxY)} deg`);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v17.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);

  // Gaze-independent-of-head check: confirm head bones stay at 0 while gaze morphs move.
  await page.evaluate(() => window.__head.setMood('neutral'));
  await new Promise((r) => setTimeout(r, 500));
  const beforeHead = await page.evaluate(() => [window.__head.getValue('bodyRotateY')||0, window.__head.getValue('headRotateY')||0]);
  await page.evaluate(() => {
    const r = document.getElementById('avatar').getBoundingClientRect();
    window.__head.lookAt(r.left + 5, r.top + r.height/2, 800);
  });
  await new Promise((r) => setTimeout(r, 900));
  const afterGaze = await page.evaluate(() => [
    window.__head.getValue('bodyRotateY')||0, window.__head.getValue('headRotateY')||0,
    window.__head.getValue('eyeLookOutLeft')||0, window.__head.getValue('eyeLookInRight')||0,
  ]);
  console.log("gaze-vs-head check: before bodyRotateY/headRotateY:", beforeHead.map(v=>(v*180/Math.PI).toFixed(2)), "| after lookAt (bodyRotateY/headRotateY/eyeLookOutLeft/eyeLookInRight):", afterGaze.map(v=>typeof v==='number'?v.toFixed(3):v));
  await page.evaluate(() => window.__head.lookAt(null, null, 300));
  await new Promise((r) => setTimeout(r, 500));

  // Full 15s+ idle sampling for happy and fear specifically (fear has [-0.7,0.7] rad config -- largest of all moods).
  await measureMood(page, 'happy', 16);
  await measureMood(page, 'fear', 16);
  await measureMood(page, 'sad', 16);
  await measureMood(page, 'angry', 16);
  await measureMood(page, 'neutral', 16);

  // Speaking-transition overshoot for fear (largest config) and happy.
  await measureTransition(page, 'fear');
  await new Promise((r) => setTimeout(r, 500));
  await measureTransition(page, 'happy');

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

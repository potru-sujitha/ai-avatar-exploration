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
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v18_candidate_v2.glb", { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
  console.log("ready:", ready, "| status:", status.replace(/\n/g, ' '));

  // Front view
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: "phase33_v2_front.png" });

  // Close-up on hairline (zoom in via setView head + negative distance)
  await page.evaluate(() => {
    window.__head.setView('head', { cameraDistance: -0.3, cameraY: 0.55, cameraX: 0 });
  });
  await new Promise((r) => setTimeout(r, 1300));
  await page.screenshot({ path: "phase33_v2_closeup_hairline.png" });

  // Three-quarter view via direct camera orbit math
  await page.evaluate(() => {
    const h = window.__head;
    const angle = Math.PI / 4; // 45 degrees
    const radius = 0.55, baseY = 1.55;
    h.camera.position.set(Math.sin(angle) * radius, baseY, Math.cos(angle) * radius);
    h.camera.lookAt(0, 1.55, 0);
    h.controls.target.set(0, 1.55, 0);
    h.controls.update();
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase33_v2_threequarter.png" });

  // Top view attempt (same technique as before, disclosed limitation if not truly overhead)
  await page.evaluate(() => {
    const h = window.__head;
    h.camera.position.set(0, 1.95, 0.2);
    h.camera.lookAt(0, 1.55, 0);
    h.controls.target.set(0, 1.55, 0);
    h.controls.update();
  });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase33_v2_top.png" });

  console.log("errors:", errors.length);
  errors.forEach(e => console.log(e));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

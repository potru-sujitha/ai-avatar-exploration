const puppeteer = require("puppeteer");

async function capture(avatarFile, outPng) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push("[console.error] " + m.text()); });
  page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto(`http://localhost:8924/phase20-demo.html?avatar=./${avatarFile}`, { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 100; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 150));
  }

  // Apply the established revealing hairline framing, hide panel.
  await page.evaluate(() => {
    const panel = document.getElementById('panel');
    if (panel) panel.style.display = 'none';
    if (window.head && typeof window.head.setView === 'function') {
      window.head.setView('head', { cameraDistance: -0.42, cameraY: 0.56, cameraX: 0 });
    }
  }).catch((e) => errors.push("[evalerr] " + e.message));

  await new Promise((r) => setTimeout(r, 1500));

  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS').catch(() => 'ERR');
  const srcCheck = await page.evaluate(() => window.__currentAvatarUrl || window.__avatarUrl || 'unknown').catch(() => 'unknown');

  await page.screenshot({ path: outPng });
  console.log(`--- ${avatarFile} ---`);
  console.log("ready:", ready, "status:", status, "srcCheck:", srcCheck);
  console.log("errors:", errors.length);
  errors.forEach((e) => console.log(e));
  await browser.close();
}

(async () => {
  await capture("avatar_v17.glb", "phase45_v17_hairline_check.png");
  await capture("avatar_v19_candidate.glb", "phase45_v19_hairline_check.png");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

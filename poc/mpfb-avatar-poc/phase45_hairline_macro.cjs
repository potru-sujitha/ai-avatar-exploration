const puppeteer = require("puppeteer");

async function capture(avatarFile, outPng) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:8924/phase20-demo.html?avatar=./${avatarFile}`, { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 100; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 150));
  }

  await page.evaluate(() => {
    const panel = document.getElementById('panel');
    if (panel) panel.style.display = 'none';
    if (window.head && typeof window.head.setView === 'function') {
      window.head.setView('head', { cameraDistance: -0.1, cameraY: 0.58, cameraX: -0.08 });
    }
  }).catch(() => {});

  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: outPng, clip: { x: 500, y: 150, width: 500, height: 350 } });
  await browser.close();
}

(async () => {
  await capture("avatar_v17.glb", "phase45_v17_macro.png");
  await capture("avatar_v19_candidate.glb", "phase45_v19_macro.png");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

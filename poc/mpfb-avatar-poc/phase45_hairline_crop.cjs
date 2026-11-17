const puppeteer = require("puppeteer");

async function capture(avatarFile, outPng) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 940, height: 760 });
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
      window.head.setView('head', { cameraDistance: -0.25, cameraY: 0.58, cameraX: 0 });
    }
  }).catch(() => {});

  await new Promise((r) => setTimeout(r, 1500));
  // Crop tightly on the forehead/hairline region.
  await page.screenshot({ path: outPng, clip: { x: 300, y: 100, width: 350, height: 250 } });
  await browser.close();
}

(async () => {
  await capture("avatar_v17.glb", "phase45_v17_hairline_zoom.png");
  await capture("avatar_v19_candidate.glb", "phase45_v19_hairline_zoom.png");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

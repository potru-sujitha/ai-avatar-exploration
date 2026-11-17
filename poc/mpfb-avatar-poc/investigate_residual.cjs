const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 750, height: 580 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v18_candidate_v2.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: -0.42, cameraY: 0.56, cameraX: 0 }); });
  await page.evaluate(() => { document.getElementById('panel').style.display = 'none'; });

  // Force the head to a perfectly centered, non-swayed neutral pose by sampling at several
  // timepoints to catch/avoid idle-sway-induced lighting variance, and disable the idle head
  // sway temporarily is out of scope -- just sample multiple frames over a few seconds.
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: `residual_check_${i}.png` });
  }
  console.log("captured 5 frames over 7.5s");
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

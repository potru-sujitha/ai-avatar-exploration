const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  for (const file of ["avatar_v17.glb", "avatar_v18_candidate_v2.glb"]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 820 });
    await page.goto(`http://localhost:8924/phase20-demo.html?avatar=./${file}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    let ready = false;
    for (let i = 0; i < 60; i++) {
      ready = await page.evaluate(() => window.__ready === true).catch(() => false);
      if (ready) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await page.evaluate(() => { window.__head.setView('head', { cameraDistance: -0.45, cameraY: 0.58, cameraX: 0 }); });
    await new Promise((r) => setTimeout(r, 1400));
    const name = file.replace('.glb','').replace('avatar_','');
    await page.screenshot({ path: `tight_hairline_${name}.png` });
    console.log("captured", name);
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

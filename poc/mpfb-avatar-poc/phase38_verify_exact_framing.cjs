const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  for (const file of ["avatar_v18_candidate_v2.glb", "avatar_v18_candidate_v3.glb"]) {
    const page = await browser.newPage();
    page.setCacheEnabled(false);
    await page.setViewport({ width: 750, height: 580 });
    await page.goto(`http://localhost:8924/phase20-demo.html?avatar=./${file}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    let ready = false;
    for (let i = 0; i < 60; i++) {
      ready = await page.evaluate(() => window.__ready === true).catch(() => false);
      if (ready) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
    console.log(file, "| status:", status.replace(/\n/g,' '));
    // EXACT framing that revealed the defect
    await page.evaluate(() => { window.__head.setView('head', { cameraDistance: -0.42, cameraY: 0.56, cameraX: 0 }); });
    await page.evaluate(() => { document.getElementById('panel').style.display = 'none'; });
    const name = file.replace('.glb','').replace('avatar_','');
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      await page.screenshot({ path: `phase38_EXACTFRAME_${name}_f${i}.png` });
    }
    console.log("captured 4 frames for", name);
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

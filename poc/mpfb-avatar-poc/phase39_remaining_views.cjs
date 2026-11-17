const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 750, height: 650 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v19_candidate.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await page.evaluate(() => { document.getElementById('panel').style.display = 'none'; });

  // helper using direct camera manipulation for angled views
  async function orbitShot(name, angleRad, elevY) {
    await page.evaluate(({angleRad, elevY}) => {
      const h = window.__head;
      const dist = 0.75;
      const cx = dist*Math.sin(angleRad), cz = dist*Math.cos(angleRad);
      h.camera.position.set(cx, elevY, cz);
      h.camera.lookAt(0, 1.55, 0);
      h.controls.target.set(0, 1.55, 0);
      h.controls.update();
    }, {angleRad, elevY});
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: `phase39_v19_${name}.png` });
  }
  await orbitShot('front', 0, 1.62);
  await orbitShot('threequarter_left', -0.6, 1.62);
  await orbitShot('threequarter_right', 0.6, 1.62);
  await orbitShot('side_left', -1.5, 1.62);
  await orbitShot('top', 0.05, 1.85);
  console.log("captured 5 orbit views");
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

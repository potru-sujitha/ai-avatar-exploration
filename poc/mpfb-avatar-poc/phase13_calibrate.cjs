const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.setViewport({ width: 900, height: 720 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v5.glb", { waitUntil: "domcontentloaded", timeout: 30000 });

  for (let i = 0; i < 40; i++) {
    const ready = await page.evaluate(() => window.__ready === true);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase13_cal_default.png" });
  console.log("captured default (head view, recalibrated lighting)");

  // Try alternate camera framings to compare against the reference head-and-shoulders crop.
  const framings = [
    { name: "tighter", cameraDistance: 1.0, cameraY: -0.5, cameraX: 0 },
    { name: "looser", cameraDistance: 2.4, cameraY: -0.35, cameraX: 0 },
  ];
  for (const f of framings) {
    await page.evaluate((f) => { window.__head.setView('head', { cameraDistance: f.cameraDistance, cameraY: f.cameraY, cameraX: f.cameraX }); }, f);
    await new Promise((r) => setTimeout(r, 1300));
    await page.screenshot({ path: `phase13_cal_framing_${f.name}.png` });
    console.log("captured framing:", f.name);
  }

  // Reset to the chosen default framing, then try two more lighting variants for comparison.
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: 1.6, cameraY: -0.45, cameraX: 0 }); });
  await new Promise((r) => setTimeout(r, 1300));

  const lightings = [
    { name: "brighter", lightAmbientIntensity: 1.1, lightDirectIntensity: 17, lightSpotIntensity: 5 },
    { name: "dimmer", lightAmbientIntensity: 0.6, lightDirectIntensity: 9, lightSpotIntensity: 2 },
  ];
  for (const l of lightings) {
    await page.evaluate((l) => {
      window.__head.setLighting({
        lightAmbientColor: 0xffffff, lightAmbientIntensity: l.lightAmbientIntensity,
        lightDirectColor: 0xfff2e6, lightDirectIntensity: l.lightDirectIntensity,
        lightDirectPhi: 0.95, lightDirectTheta: 1.25,
        lightSpotColor: 0xaac4e8, lightSpotIntensity: l.lightSpotIntensity,
        lightSpotPhi: 1.2, lightSpotTheta: 4.8, lightSpotDispersion: 0.8,
      });
    }, l);
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: `phase13_cal_lighting_${l.name}.png` });
    console.log("captured lighting:", l.name);
  }

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

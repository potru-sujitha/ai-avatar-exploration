const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 720 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v5.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => window.__ready === true)) break; await new Promise((r) => setTimeout(r, 300)); }
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: "phase13_final_default.png" });
  console.log("captured final default (correct framing + current lighting)");

  const lightings = [
    { name: "A_current", lightAmbientIntensity: 0.85, lightDirectIntensity: 13, lightSpotIntensity: 3.5 },
    { name: "B_dimmer", lightAmbientIntensity: 0.6, lightDirectIntensity: 9, lightSpotIntensity: 2 },
    { name: "C_brighter", lightAmbientIntensity: 1.1, lightDirectIntensity: 17, lightSpotIntensity: 5 },
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
    await page.screenshot({ path: `phase13_final_lighting_${l.name}.png` });
    console.log("captured", l.name);
  }
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

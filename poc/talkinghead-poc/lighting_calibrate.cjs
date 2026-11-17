const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8923/poc2.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 40; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  await page.evaluate(() => {
    const h = window.__head;
    h.renderer.shadowMap.enabled = true;
    h.lightDirect.castShadow = true;
    h.lightDirect.shadow.mapSize.width = 1024;
    h.lightDirect.shadow.mapSize.height = 1024;
    h.lightDirect.shadow.camera.near = 0.1;
    h.lightDirect.shadow.camera.far = 3;
    h.lightDirect.shadow.camera.left = -0.5;
    h.lightDirect.shadow.camera.right = 0.5;
    h.lightDirect.shadow.camera.top = 0.8;
    h.lightDirect.shadow.camera.bottom = -0.3;
    h.lightDirect.shadow.bias = -0.002;
    h.armature.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  });

  const combos = [
    { name: "A_ambient1.4_direct18", lightAmbientIntensity: 1.4, lightDirectIntensity: 18, lightDirectColor: 0xffffff, lightDirectPhi: 0.85, lightDirectTheta: 1.3, lightSpotIntensity: 0 },
    { name: "B_ambient1.6_direct22_rim", lightAmbientIntensity: 1.6, lightDirectIntensity: 22, lightDirectColor: 0xffffff, lightDirectPhi: 0.85, lightDirectTheta: 1.3, lightSpotColor: 0xaaccff, lightSpotIntensity: 8, lightSpotPhi: 1.2, lightSpotTheta: 4.8, lightSpotDispersion: 0.8 },
    { name: "C_ambient1.8_direct15", lightAmbientIntensity: 1.8, lightDirectIntensity: 15, lightDirectColor: 0xffffff, lightDirectPhi: 0.9, lightDirectTheta: 1.1, lightSpotIntensity: 0 },
  ];

  for (const c of combos) {
    await page.evaluate((opt) => { window.__head.setLighting(opt); }, c);
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({ path: `lighting_${c.name}.png` });
    console.log("captured", c.name);
  }

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

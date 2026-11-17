const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8923/poc2.html", { waitUntil: "domcontentloaded", timeout: 30000 });

  for (let i = 0; i < 40; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "lighting_before.png" });
  console.log("captured BEFORE (default flat lighting)");

  // Professional three-point lighting + real shadow casting
  const result = await page.evaluate(() => {
    const h = window.__head;
    const THREE = h.armature.constructor.name; // sanity

    // 1) Key + fill + rim via setLighting (softer ambient fill, stronger directional key, spot as rim)
    h.setLighting({
      lightAmbientColor: 0xffffff,
      lightAmbientIntensity: 1.1,
      lightDirectColor: 0xfff4e6,
      lightDirectIntensity: 45,
      lightDirectPhi: 1.0,
      lightDirectTheta: 0.9,
      lightSpotColor: 0xcfe0ff,
      lightSpotIntensity: 18,
      lightSpotPhi: 1.3,
      lightSpotTheta: 4.6,
      lightSpotDispersion: 0.7,
    });

    // 2) Enable real shadow casting (hardcoded off at init in this library)
    h.renderer.shadowMap.enabled = true;
    h.renderer.shadowMap.type = THREE === undefined ? h.renderer.shadowMap.type : h.renderer.shadowMap.type;
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

    let meshCount = 0;
    h.armature.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        meshCount++;
      }
    });

    return { meshCount, ambientIntensity: h.lightAmbient.intensity, directIntensity: h.lightDirect.intensity };
  });
  console.log("lighting reconfigured:", result);

  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: "lighting_after.png" });
  console.log("captured AFTER (three-point lighting + shadows)");

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

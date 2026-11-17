const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v7.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => window.__ready === true).catch(() => false)) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  // direct extreme coordinate call, bypassing the button's rect-based logic
  await page.evaluate(() => { window.__head.lookAt(470, 700, 1200); });
  await new Promise((r) => setTimeout(r, 1300));
  const v = await page.evaluate(() => {
    const h = window.__head;
    return { eyeLookDownLeft: h.getValue('eyeLookDownLeft'), eyesLookDown: h.getValue('eyesLookDown'), cameraExists: !!h.camera, armatureExists: !!h.armature };
  });
  console.log("DIRECT lookAt(470,700) result:", JSON.stringify(v));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

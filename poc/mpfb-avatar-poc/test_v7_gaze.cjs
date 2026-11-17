const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v7.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => window.__ready === true).catch(() => false)) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  // fresh page, nothing else run yet -- isolate purely the gaze-down call
  await page.click('#lookDown');
  await new Promise((r) => setTimeout(r, 1300));
  const down = await page.evaluate(() => {
    const h = window.__head;
    return { eyeLookDownLeft: h.getValue('eyeLookDownLeft'), eyeLookDownRight: h.getValue('eyeLookDownRight'), eyesLookDown: h.getValue('eyesLookDown') };
  });
  console.log("ISOLATED GAZE DOWN:", JSON.stringify(down));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

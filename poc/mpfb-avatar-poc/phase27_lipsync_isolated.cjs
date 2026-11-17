const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase26-demo.html?avatar=./avatar_v15_stage.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await page.click('#play');
  const allNames = ["viseme_aa","viseme_PP","viseme_O","viseme_E","viseme_U","viseme_I","viseme_kk","viseme_SS","viseme_nn","viseme_RR","viseme_DD","viseme_FF","viseme_TH","viseme_CH"];
  let maxSeen = 0, maxName = "";
  for (let i = 0; i < 40; i++) {
    const vals = await page.evaluate((names) => names.map(n => window.__head.getValue(n) || 0), allNames);
    const localMax = Math.max(...vals);
    if (localMax > maxSeen) { maxSeen = localMax; maxName = allNames[vals.indexOf(localMax)]; }
    await new Promise((r) => setTimeout(r, 75));
  }
  console.log("ISOLATED lipsync dense-sample max across all visemes over ~3s:", maxSeen, maxName);
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

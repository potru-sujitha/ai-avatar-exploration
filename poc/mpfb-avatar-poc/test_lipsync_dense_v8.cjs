const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v8.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => window.__ready === true).catch(() => false)) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  await page.click('#play');
  const names = ["viseme_aa","viseme_I","viseme_PP","viseme_O","viseme_E","viseme_U","viseme_kk","viseme_SS","viseme_nn","viseme_FF","viseme_DD","viseme_CH","viseme_TH","viseme_RR"];
  const maxByName = Object.fromEntries(names.map(n => [n, 0]));
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 50));
    const v = await page.evaluate((names) => names.map(n => window.__head.getValue(n) || 0), names);
    names.forEach((n, idx) => { if (v[idx] > maxByName[n]) maxByName[n] = v[idx]; });
  }
  console.log("v8 DENSE 50ms-step lipsync max per viseme over 3s:", JSON.stringify(maxByName));
  const overallMax = Math.max(...Object.values(maxByName));
  console.log("overall max:", overallMax);
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

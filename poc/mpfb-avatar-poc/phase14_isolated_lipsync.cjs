const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v8.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => window.__ready === true).catch(() => false)) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  if (await page.evaluate(() => window.__head.audioCtx.state) === 'suspended') {
    await page.evaluate(() => window.__head.audioCtx.resume());
  }
  await page.click('#play');
  const samples = [];
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const v = await page.evaluate(() => {
      const h = window.__head;
      const names = ["viseme_aa","viseme_I","viseme_PP","viseme_O","viseme_E","viseme_U","viseme_kk","viseme_SS"];
      return names.map(n => h.getValue(n) || 0);
    });
    samples.push(v);
  }
  const names = ["aa","I","PP","O","E","U","kk","SS"];
  const maxVals = names.map((n,i) => [n, Math.max(...samples.map(s => s[i]))]);
  console.log("ISOLATED LIPSYNC max per viseme:", JSON.stringify(maxVals));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

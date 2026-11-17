const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v6.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => window.__ready === true)) break; await new Promise((r) => setTimeout(r, 300)); }
  await page.click('#play');
  const samples = [];
  const keys = ['viseme_aa', 'viseme_PP', 'viseme_O', 'viseme_E', 'viseme_I'];
  for (let i = 0; i < 20; i++) {
    const v = await page.evaluate((keys) => Object.fromEntries(keys.map(k => [k, window.__head.getValue(k)])), keys);
    samples.push(v);
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log(JSON.stringify(samples));
  const maxAny = Math.max(...samples.flatMap(s => Object.values(s).map(v => v || 0)));
  console.log("max any viseme:", maxAny);
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

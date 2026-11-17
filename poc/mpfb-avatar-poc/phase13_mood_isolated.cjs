const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v6.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => window.__ready === true)) break; await new Promise((r) => setTimeout(r, 300)); }
  const results = {};
  for (const [mood, key] of [["happy", "mouthSmile"], ["sad", "mouthFrownLeft"], ["fear", "eyeWideLeft"]]) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise((r) => setTimeout(r, 4000));
    results[mood] = await page.evaluate((k) => window.__head.getValue(k), key);
  }
  console.log("mood results:", JSON.stringify(results));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

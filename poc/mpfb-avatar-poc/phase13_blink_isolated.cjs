const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v6.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => window.__ready === true)) break; await new Promise((r) => setTimeout(r, 300)); }
  console.log("ready, armature meshes with eyeBlinkLeft:", await page.evaluate(() => {
    let found = 0;
    window.__head.armature.traverse(o => { if (o.morphTargetDictionary && 'eyeBlinkLeft' in o.morphTargetDictionary) found++; });
    return found;
  }));
  const samples = [];
  for (let i = 0; i < 44; i++) {
    samples.push(await page.evaluate(() => window.__head.getValue('eyeBlinkLeft')));
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log("blink samples:", JSON.stringify(samples));
  console.log("max:", Math.max(...samples.map(v => v || 0)));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase21-demo.html?avatar=./avatar_v13.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await page.evaluate(() => { window.__head.setValue('eyeBlinkLeft', 1, 0); });
  await new Promise(r => setTimeout(r, 500));
  const v1 = await page.evaluate(() => window.__head.getValue('eyeBlinkLeft'));
  console.log("after setValue(1) + 500ms wait:", v1);

  // also check raw mesh morphTargetInfluences directly, bypassing getValue entirely
  const raw = await page.evaluate(() => {
    const h = window.__head;
    let result = null;
    h.armature.traverse(n => {
      if (n.morphTargetDictionary && n.morphTargetDictionary.eyeBlinkLeft !== undefined && n.name.includes('Human_export_copy')) {
        result = n.morphTargetInfluences[n.morphTargetDictionary.eyeBlinkLeft];
      }
    });
    return result;
  });
  console.log("raw morphTargetInfluences on main body mesh:", raw);

  // check animClock is actually advancing
  const clock1 = await page.evaluate(() => window.__head.animClock);
  await new Promise(r => setTimeout(r, 500));
  const clock2 = await page.evaluate(() => window.__head.animClock);
  console.log("animClock progression:", clock1, "->", clock2, "(delta=" + (clock2-clock1) + ")");
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

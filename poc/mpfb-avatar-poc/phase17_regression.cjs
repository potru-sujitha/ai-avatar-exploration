const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase17-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);

  // morph target counts
  const counts = await page.evaluate(() => {
    const h = window.__head; let v=0, a=0;
    h.armature.traverse((o) => { if (o.morphTargetDictionary) { const k=Object.keys(o.morphTargetDictionary); const vv=k.filter(x=>x.startsWith('viseme_')).length; if (vv>v){v=vv; a=k.filter(x=>!x.startsWith('viseme_')).length;} } });
    return {v,a};
  });
  console.log("visemes:", counts.v, "other morphs:", counts.a);

  // lip-sync
  await page.evaluate(() => window.__head.audioCtx.resume());
  await page.click('#play');
  const lipVals = [];
  for (let i=0;i<10;i++){ await new Promise(r=>setTimeout(r,200)); const v = await page.evaluate(()=>window.__head.getValue('viseme_aa')); lipVals.push(v.toFixed(3)); }
  console.log("lip-sync viseme_aa samples:", lipVals.join(','));

  // blink over ~20s
  const blinkVals = [];
  for (let i=0;i<40;i++){ await new Promise(r=>setTimeout(r,500)); const v = await page.evaluate(()=>window.__head.getValue('eyeBlinkLeft')); blinkVals.push(v); }
  console.log("blink max over 20s:", Math.max(...blinkVals));

  // gaze up/down
  await page.evaluate(() => { const r=document.getElementById('avatar').getBoundingClientRect(); window.__head.lookAt(r.left+r.width/2, r.top, 1200); });
  await new Promise(r=>setTimeout(r,1300));
  const gazeUp = await page.evaluate(()=>window.__head.getValue('eyesLookUp'));
  console.log("gaze up:", gazeUp);
  await page.evaluate(() => { const r=document.getElementById('avatar').getBoundingClientRect(); window.__head.lookAt(r.left+r.width/2, r.bottom, 1200); });
  await new Promise(r=>setTimeout(r,1300));
  const gazeDown = await page.evaluate(()=>window.__head.getValue('eyesLookDown'));
  console.log("gaze down:", gazeDown);

  // moods
  await page.click('#moodHappy');
  await new Promise(r=>setTimeout(r,9000));
  const happy = await page.evaluate(()=>window.__head.getValue('mouthSmile'));
  console.log("happy mouthSmile after 9s:", happy);

  await page.click('#moodSad');
  await new Promise(r=>setTimeout(r,9000));
  const sad = await page.evaluate(()=>window.__head.getValue('mouthFrownLeft'));
  console.log("sad mouthFrownLeft after 9s:", sad);

  await page.click('#moodFear');
  await new Promise(r=>setTimeout(r,9000));
  const fear = await page.evaluate(()=>window.__head.getValue('eyeWideLeft'));
  console.log("fear eyeWideLeft after 9s:", fear);

  await page.click('#moodNeutral');
  await new Promise(r=>setTimeout(r,9000));
  const neutralSmile = await page.evaluate(()=>window.__head.getValue('mouthSmile'));
  console.log("neutral (after returning from other moods) mouthSmile after 9s:", neutralSmile);

  console.log("errors:", errors.length);
  errors.forEach(e=>console.log(e));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

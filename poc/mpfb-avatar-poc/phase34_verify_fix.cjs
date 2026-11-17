const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase20-demo.html?avatar=./avatar_v17.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);
  const status = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
  console.log(status.replace(/\n/g, ' '));
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: "phase34_front_after.png" });

  console.log("--- IDLE sampling (15s) AFTER FIX ---");
  const idleSamples = [];
  for (let i = 0; i < 30; i++) {
    const v = await page.evaluate(() => window.__head.getValue('bodyRotateY'));
    idleSamples.push(v);
    await new Promise((r) => setTimeout(r, 500));
  }
  const vals = idleSamples.filter(v => v != null);
  console.log("idle bodyRotateY: min=" + Math.min(...vals).toFixed(4) + " max=" + Math.max(...vals).toFixed(4) + " (deg: " + (Math.min(...vals)*180/Math.PI).toFixed(1) + " to " + (Math.max(...vals)*180/Math.PI).toFixed(1) + ")");

  // speaking + screenshot
  await page.click('#play').catch(()=>{});
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: "phase34_speaking_after.png" });
  const speakSamples = [];
  for (let i = 0; i < 10; i++) {
    speakSamples.push(await page.evaluate(() => window.__head.getValue('bodyRotateY')));
    await new Promise((r) => setTimeout(r, 150));
  }
  const sv = speakSamples.filter(v=>v!=null);
  console.log("speaking bodyRotateY: min=" + Math.min(...sv).toFixed(4) + " max=" + Math.max(...sv).toFixed(4) + " (deg: " + (Math.min(...sv)*180/Math.PI).toFixed(1) + " to " + (Math.max(...sv)*180/Math.PI).toFixed(1) + ")");

  // regression: visemes/morphs
  const morphInfo = await page.evaluate(() => {
    const h = window.__head; let mesh=null, visemes=0, total=0;
    h.armature.traverse((o) => { if (o.morphTargetDictionary) { const keys=Object.keys(o.morphTargetDictionary); const v=keys.filter(k=>k.startsWith('viseme_')).length; if (v>visemes){visemes=v; total=keys.length;} } });
    return {visemes, total};
  });
  console.log("morphs:", JSON.stringify(morphInfo));

  // blink isolated, 22s
  let blinkMax = 0;
  for (let i=0;i<44;i++){ const v=await page.evaluate(()=>window.__head.getValue('eyeBlinkLeft')||0); if(v>blinkMax)blinkMax=v; await new Promise(r=>setTimeout(r,500)); }
  console.log("blink max over 22s:", blinkMax.toFixed(3));

  // gaze
  await page.evaluate(() => { const r=document.getElementById('avatar').getBoundingClientRect(); window.__head.lookAt(r.left+10, r.top+r.height/2, 1200); });
  await new Promise(r=>setTimeout(r,1400));
  const gaze = await page.evaluate(()=>window.__head.getValue('eyeLookOutLeft')||0);
  console.log("gaze eyeLookOutLeft:", gaze.toFixed(3));

  // mood (happy) + screenshot
  await page.evaluate(()=>window.__head.setMood('happy'));
  await new Promise(r=>setTimeout(r,4000));
  await page.screenshot({ path: "phase34_neutral_happy_after.png" });
  const happyVal = await page.evaluate(()=>window.__head.getValue('mouthSmile')||0);
  console.log("happy mouthSmile (4s):", happyVal.toFixed(3));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

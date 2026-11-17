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

  // Sample idle bodyRotateY/Z and headRotateY/Z over 15s
  console.log("--- IDLE sampling (15s) ---");
  const idleSamples = [];
  for (let i = 0; i < 30; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      return {
        bodyRotateY: h.getValue('bodyRotateY'),
        bodyRotateZ: h.getValue('bodyRotateZ'),
        headRotateY: h.getValue('headRotateY'),
        headRotateZ: h.getValue('headRotateZ'),
        stateName: h.stateName,
      };
    });
    idleSamples.push(v);
    await new Promise((r) => setTimeout(r, 500));
  }
  const bodyYvals = idleSamples.map(s => s.bodyRotateY).filter(v => v != null);
  const bodyZvals = idleSamples.map(s => s.bodyRotateZ).filter(v => v != null);
  console.log("idle bodyRotateY: min=" + Math.min(...bodyYvals).toFixed(4) + " max=" + Math.max(...bodyYvals).toFixed(4) + " (deg: " + (Math.min(...bodyYvals)*180/Math.PI).toFixed(1) + " to " + (Math.max(...bodyYvals)*180/Math.PI).toFixed(1) + ")");
  console.log("idle bodyRotateZ: min=" + Math.min(...bodyZvals).toFixed(4) + " max=" + Math.max(...bodyZvals).toFixed(4) + " (deg: " + (Math.min(...bodyZvals)*180/Math.PI).toFixed(1) + " to " + (Math.max(...bodyZvals)*180/Math.PI).toFixed(1) + ")");
  console.log("sample stateNames:", [...new Set(idleSamples.map(s=>s.stateName))]);

  // Sample during speaking
  await page.click('#play').catch(()=>{});
  console.log("--- SPEAKING sampling (2s) ---");
  const speakSamples = [];
  for (let i = 0; i < 10; i++) {
    const v = await page.evaluate(() => ({
      bodyRotateY: window.__head.getValue('bodyRotateY'),
      bodyRotateZ: window.__head.getValue('bodyRotateZ'),
      stateName: window.__head.stateName,
    }));
    speakSamples.push(v);
    await new Promise((r) => setTimeout(r, 200));
  }
  const speakY = speakSamples.map(s=>s.bodyRotateY).filter(v=>v!=null);
  console.log("speaking bodyRotateY: min=" + Math.min(...speakY).toFixed(4) + " max=" + Math.max(...speakY).toFixed(4) + " (deg: " + (Math.min(...speakY)*180/Math.PI).toFixed(1) + " to " + (Math.max(...speakY)*180/Math.PI).toFixed(1) + ")");
  console.log("speaking stateNames:", [...new Set(speakSamples.map(s=>s.stateName))]);

  // Rest pose check: headRotateX/Y/Z right after load before any idle anim ticks much
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

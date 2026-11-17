const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  page.on("console", (m) => console.log("[console]", m.text()));
  page.on("pageerror", (e) => console.log("[pageerror]", e.message, e.stack ? e.stack.slice(0,500) : ''));
  await page.setViewport({ width: 940, height: 760 });
  await page.evaluateOnNewDocument(() => {
    window.addEventListener('error', (e) => console.log('WINDOW ERROR:', e.message, e.filename, e.lineno));
  });
  await page.goto("http://localhost:8924/phase21-demo.html?avatar=./avatar_v13.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  // check for context loss
  const ctxInfo = await page.evaluate(() => {
    const h = window.__head;
    const gl = h.renderer.getContext();
    return { isContextLost: gl.isContextLost(), rafId: h._raf, isRunning: h.isRunning };
  });
  console.log("CTX INFO:", JSON.stringify(ctxInfo));
  await new Promise(r => setTimeout(r, 1000));
  const ctxInfo2 = await page.evaluate(() => {
    const h = window.__head;
    return { rafId: h._raf, animClock: h.animClock };
  });
  console.log("CTX INFO after 1s:", JSON.stringify(ctxInfo2));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

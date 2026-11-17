const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase18-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);

  const rect = await page.evaluate(() => {
    const r = document.getElementById('avatar').getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height, bottom: r.bottom };
  });
  console.log("avatar rect:", JSON.stringify(rect));

  const diag = await page.evaluate((rect) => {
    const h = window.__head;
    h.lookAt(rect.left + rect.width/2, rect.bottom - 10, 1200);
    const entry = h.animQueue.find(x => x.template && x.template.name === 'lookat');
    return entry ? { vs: JSON.stringify(entry.vs), ts: entry.ts } : "NO LOOKAT ENTRY FOUND";
  }, rect);
  console.log("lookat animQueue entry right after call:", JSON.stringify(diag));

  await new Promise(r => setTimeout(r, 1500));
  const after = await page.evaluate(() => ({
    eyesLookDown: window.__head.getValue('eyesLookDown'),
    bodyRotateX: window.__head.getValue('bodyRotateX'),
    eyesRotateX_baseline: window.__head.mtAvatar['eyesLookDown'] ? window.__head.mtAvatar['eyesLookDown'].baseline : 'n/a',
  }));
  console.log("after 1.5s:", JSON.stringify(after));

  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });

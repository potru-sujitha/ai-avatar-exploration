const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase17-demo.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);
  await page.click('#play');
  const samples = [];
  for (let i=0;i<30;i++){
    await new Promise(r=>setTimeout(r,100));
    const v = await page.evaluate(() => {
      const h = window.__head;
      const names = ["viseme_aa","viseme_O","viseme_E","viseme_PP","viseme_kk"];
      return { isStreaming: h.isStreaming, isSpeaking: h.isSpeaking, max: Math.max(...names.map(n=>h.getValue(n)||0)) };
    });
    samples.push(`t=${(i*100)}ms streaming=${v.isStreaming} speaking=${v.isSpeaking} max=${v.max.toFixed(3)}`);
  }
  console.log(samples.join('\n'));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

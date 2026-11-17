const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("console", (m) => console.log("[console]", m.text()));
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v10.glb", { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("ready:", ready);

  const clicked = await page.evaluate(() => {
    const btn = document.getElementById('play');
    const disabled = btn.disabled;
    btn.click();
    return { disabled };
  });
  console.log("play button state before click:", clicked);

  const visemeNames = ["aa","E","I","O","U","PP","SS","TH","CH","FF","kk","nn","RR","DD"];
  let maxViseme = 0;
  const log = [];
  for (let i = 0; i < 35; i++) {
    const vals = await page.evaluate((names) => {
      const h = window.__head;
      return { streaming: h.isStreaming, speaking: h.isSpeaking, vals: names.map(n => h.getValue('viseme_' + n) || 0) };
    }, visemeNames);
    const m = Math.max(...vals.vals);
    maxViseme = Math.max(maxViseme, m);
    log.push(`t=${i*100}ms streaming=${vals.streaming} speaking=${vals.speaking} max=${m.toFixed(3)}`);
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log(log.join("\n"));
  console.log("FINAL max viseme:", maxViseme.toFixed(3));

  const statusText = await page.evaluate(() => document.getElementById('status')?.textContent);
  console.log("status at end:", statusText);

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/phase13-demo.html?avatar=./avatar_v7.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => window.__ready === true).catch(() => false)) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  await page.click('#play');
  await new Promise((r) => setTimeout(r, 600));
  const state = await page.evaluate(() => {
    const h = window.__head;
    return { isSpeaking: h.isSpeaking, isStreaming: h.isStreaming, audioCtxState: h.audioCtx.state, streamErr: window.__streamError || null, status: document.getElementById('status').textContent };
  });
  console.log("STATE at 600ms:", JSON.stringify(state));
  await new Promise((r) => setTimeout(r, 700));
  const vals = await page.evaluate(() => {
    const h = window.__head;
    return ["viseme_aa","viseme_I","viseme_O"].map(n => [n, h.getValue(n)]);
  });
  console.log("VALUES at 1300ms:", JSON.stringify(vals));
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

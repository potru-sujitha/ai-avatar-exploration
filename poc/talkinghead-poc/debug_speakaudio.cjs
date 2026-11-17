const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("console", m => console.log("[console]", m.text()));
  page.on("pageerror", e => console.log("[pageerror]", e.message));
  await page.goto("http://localhost:8923/poc.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 30; i++) { if (await page.evaluate(() => window.__ready)) break; await new Promise(r=>setTimeout(r,300)); }
  await page.click("#play");
  await new Promise(r => setTimeout(r, 500));
  const status = await page.evaluate(() => document.getElementById('status').textContent);
  const err = await page.evaluate(() => window.__speakError);
  console.log("status:", status);
  console.log("error:", err);
  // check speechQueue / isSpeaking internal state
  const internal = await page.evaluate(() => {
    const h = window.__head;
    return { speechQueueLen: h.speechQueue?.length, isSpeaking: h.isSpeaking, isAudioPlaying: h.isAudioPlaying, audioCtxState: h.audioCtx?.state };
  });
  console.log("internal:", JSON.stringify(internal));
  await browser.close();
})().catch(e => { console.error("FATAL", e); process.exit(1); });

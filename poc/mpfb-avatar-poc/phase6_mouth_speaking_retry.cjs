const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/poc.html?avatar=avatar_v4.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  // Set the mouth close-up camera FIRST, before playback, with full tween wait.
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: -1.65, cameraY: -0.08 }); });
  await new Promise((r) => setTimeout(r, 1300));

  if (await page.evaluate(() => document.getElementById('play').disabled)) {
    console.log("play button is disabled, cannot click");
  }
  await page.click("#play");

  const samples = [];
  for (let i = 0; i < 80; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      const names = ["viseme_aa","viseme_PP","viseme_O","viseme_E","viseme_kk","viseme_I","viseme_U","viseme_SS","viseme_FF"];
      return { max: Math.max(...names.map((n) => h.getValue(n) || 0)), isSpeaking: h.isSpeaking, status: document.getElementById('status').textContent };
    });
    samples.push(v.max);
    if (v.max > 0.25) {
      await page.screenshot({ path: "phase6_07e_mouth_speaking_caught.png" });
      console.log(`captured at i=${i}, maxVal=${v.max}, status=${v.status}`);
      break;
    }
    if (i === 10) console.log("sample at i=10:", JSON.stringify(v));
    await new Promise((r) => setTimeout(r, 50));
  }
  console.log("max observed across all samples:", Math.max(...samples));
  console.log("samples:", JSON.stringify(samples));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

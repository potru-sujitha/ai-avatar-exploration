const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push("[pageerror] " + e.message));
  page.on("requestfailed", (r) => failedRequests.push(r.url() + " :: " + r.failure()?.errorText));
  page.on("response", (r) => { if (r.status() >= 400) failedRequests.push(r.url() + " :: HTTP " + r.status()); });

  await page.setViewport({ width: 940, height: 760 });
  const url = `http://localhost:8924/phase13-demo.html?avatar=./avatar_v7.glb&cb=${Date.now()}`;
  console.log("loading", url);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 50; i++) {
    ready = await page.evaluate(() => window.__ready === true);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log("ready:", ready);
  const status = await page.evaluate(() => document.getElementById('status').textContent);
  console.log("status:", status);
  const avatarUrlUsed = await page.evaluate(() => window.__head?.opt?.url || "unknown");
  console.log("avatar url actually used by engine:", avatarUrlUsed);

  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase13b_neutral.png" });

  // mid-speech lip-sync
  await page.click('#play');
  await new Promise((r) => setTimeout(r, 900));
  const visemeSample = await page.evaluate(() => {
    const h = window.__head;
    return ["viseme_aa", "viseme_PP", "viseme_O", "viseme_E"].map((n) => [n, h.getValue(n)]);
  });
  console.log("mid-speech viseme sample:", JSON.stringify(visemeSample));
  await page.screenshot({ path: "phase13b_midspeech.png" });
  await new Promise((r) => setTimeout(r, 1500));
  await page.click('#stop');

  // blink (sample over 22s per the established lesson)
  const blinkSamples = [];
  for (let i = 0; i < 22; i++) {
    const v = await page.evaluate(() => window.__head.getValue("eyeBlinkLeft"));
    blinkSamples.push(v);
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log("blink max over 22s:", Math.max(...blinkSamples.map((v) => v || 0)));
  await page.click('#blink');
  await new Promise((r) => setTimeout(r, 90));
  await page.screenshot({ path: "phase13b_blink.png" });

  // gaze up/down
  await page.click('#lookUp');
  await new Promise((r) => setTimeout(r, 1300));
  const gazeUp = await page.evaluate(() => window.__head.getValue("eyesLookUp"));
  await page.screenshot({ path: "phase13b_lookup.png" });
  await page.click('#lookDown');
  await new Promise((r) => setTimeout(r, 1300));
  const gazeDown = await page.evaluate(() => window.__head.getValue("eyesLookDown"));
  await page.screenshot({ path: "phase13b_lookdown.png" });
  console.log("gaze up/down values:", gazeUp, gazeDown);
  await page.click('#lookCenter');
  await new Promise((r) => setTimeout(r, 1000));

  // mood checks (happy/sad/fear only)
  const moodResults = {};
  for (const mood of ["happy", "sad", "fear"]) {
    await page.evaluate((m) => window.__head.setMood(m), mood);
    await new Promise((r) => setTimeout(r, 4000));
    moodResults[mood] = await page.evaluate((m) => {
      const h = window.__head;
      if (m === "happy") return h.getValue("mouthSmile");
      if (m === "sad") return h.getValue("mouthFrownLeft");
      return h.getValue("browInnerUp");
    }, mood);
  }
  console.log("mood results (happy/sad/fear):", JSON.stringify(moodResults));
  await page.evaluate(() => window.__head.setMood("neutral"));

  console.log("CONSOLE_ERRORS:", JSON.stringify(consoleErrors));
  console.log("FAILED_REQUESTS:", JSON.stringify(failedRequests));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

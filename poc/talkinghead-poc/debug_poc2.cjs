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
  await page.goto("http://localhost:8923/poc2.html", { waitUntil: "domcontentloaded", timeout: 30000 });

  for (let i = 0; i < 40; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) { console.log("STATUS:", status); break; }
    await new Promise((r) => setTimeout(r, 300));
  }

  await page.click("#play");
  console.log("clicked play, sampling viseme values over time...");

  const samples = [];
  for (let i = 0; i < 20; i++) {
    const w = await page.evaluate(() => {
      const h = window.__head;
      const names = ["viseme_aa", "viseme_PP", "viseme_O", "viseme_E", "viseme_kk"];
      return {
        status: document.getElementById('status').textContent,
        values: names.map((n) => h.getValue(n)),
        isSpeaking: h.isSpeaking,
        isStreaming: h.isStreaming,
      };
    });
    samples.push(w);
    if (i === 8) await page.screenshot({ path: "speaking_front_v2.png" });
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(JSON.stringify(samples, null, 1));

  const err = await page.evaluate(() => window.__streamError || null);
  if (err) console.log("STREAM ERROR:", err);

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

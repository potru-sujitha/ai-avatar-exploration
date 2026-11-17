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
  await page.goto("http://localhost:8923/poc.html", { waitUntil: "domcontentloaded", timeout: 30000 });

  for (let i = 0; i < 30; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) { console.log("STATUS:", status); break; }
    await new Promise((r) => setTimeout(r, 500));
  }

  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: process.argv[2] || "idle_front.png" });
  console.log("captured idle screenshot");

  // trigger playback of the real viseme timeline
  await page.click("#play");
  await new Promise((r) => setTimeout(r, 900)); // mid-speech
  await page.screenshot({ path: process.argv[3] || "speaking_front.png" });
  console.log("captured mid-speech screenshot");

  // sample jawOpen-equivalent (viseme weights) during playback to prove real movement
  const samples = [];
  for (let i = 0; i < 15; i++) {
    const w = await page.evaluate(() => {
      const h = window.__head;
      const names = ["viseme_aa", "viseme_PP", "viseme_O", "viseme_E"];
      return names.map((n) => h.getValue(n));
    });
    samples.push(w);
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log("viseme samples over time (viseme_aa, viseme_PP, viseme_O, viseme_E):");
  console.log(JSON.stringify(samples));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

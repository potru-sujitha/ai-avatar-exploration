const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
           "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8923/poc2.html", { waitUntil: "domcontentloaded", timeout: 30000 });

  for (let i = 0; i < 40; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  // Just let the avatar idle (no speech) and sample blink-related morphs for 8s.
  const samples = [];
  for (let i = 0; i < 40; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      return [h.getValue("eyeBlinkLeft"), h.getValue("eyeBlinkRight")];
    });
    samples.push(v);
    await new Promise((r) => setTimeout(r, 200));
  }
  const maxBlink = Math.max(...samples.map((s) => Math.max(s[0] || 0, s[1] || 0)));
  console.log("max blink value observed over 8s idle:", maxBlink);
  console.log("nonzero frames:", samples.filter((s) => (s[0] || 0) > 0.1 || (s[1] || 0) > 0.1).length, "/", samples.length);

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

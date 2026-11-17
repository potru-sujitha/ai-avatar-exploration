const puppeteer = require("puppeteer");

async function sample(avatarFile, n) {
  const results = [];
  for (let trial = 0; trial < n; trial++) {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 940, height: 760 });
    await page.goto(`http://localhost:8924/poc.html?avatar=${avatarFile}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    for (let i = 0; i < 60; i++) {
      const status = await page.evaluate(() => document.getElementById("status").textContent);
      if (status.includes("ready")) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    // sample immediately -- minimal idle drift
    await new Promise((r) => setTimeout(r, 300));
    const v = await page.evaluate(() => {
      const h = window.__head;
      return {
        headRotateX: h.getValue("headRotateX"),
        bodyRotateX: h.getValue("bodyRotateX"),
        eyesLookDown: h.getValue("eyesLookDown"),
      };
    });
    results.push(v);
    await browser.close();
  }
  return results;
}

(async () => {
  console.log("=== v4 (unfixed), 5 fresh-load samples at t=300ms ===");
  const v4 = await sample("avatar_v4.glb", 5);
  console.log(JSON.stringify(v4, null, 1));

  console.log("=== v5 (head-tilt fix applied), 5 fresh-load samples at t=300ms ===");
  const v5 = await sample("avatar_v5.glb", 5);
  console.log(JSON.stringify(v5, null, 1));
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

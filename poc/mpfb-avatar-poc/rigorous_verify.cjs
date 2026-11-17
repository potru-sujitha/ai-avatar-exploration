const puppeteer = require("puppeteer");
const crypto = require("crypto");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setCacheEnabled(false); // force no browser cache whatsoever

  let glbBytesReceived = 0;
  let glbUrl = null;
  page.on("response", async (res) => {
    if (res.url().includes(".glb")) {
      glbUrl = res.url();
      try {
        const buf = await res.buffer();
        glbBytesReceived = buf.length;
        const hash = crypto.createHash("sha256").update(buf).digest("hex");
        console.log("NETWORK GLB URL:", res.url());
        console.log("NETWORK GLB bytes:", buf.length);
        console.log("NETWORK GLB sha256:", hash);
      } catch (e) { console.log("could not buffer response:", e.message); }
    }
  });

  await page.setViewport({ width: 750, height: 580 });
  const url = "http://localhost:8924/phase20-demo.html?avatar=./avatar_v18_candidate_v2.glb";
  console.log("NAVIGATING TO:", url);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const statusText = await page.evaluate(() => document.getElementById('status')?.textContent || 'NO STATUS');
  console.log("STATUS PANEL TEXT:", JSON.stringify(statusText));

  // Match the user's exact framing: tight face+hairline crop, front-on
  await page.evaluate(() => {
    window.__head.setView('head', { cameraDistance: -0.42, cameraY: 0.56, cameraX: 0 });
  });
  await new Promise((r) => setTimeout(r, 1500));

  // Hide the control panel for a clean, directly-comparable crop like the user's screenshot
  await page.evaluate(() => { document.getElementById('panel').style.display = 'none'; });
  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: "RIGOROUS_v18v2_matched_crop.png" });
  console.log("screenshot saved");

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

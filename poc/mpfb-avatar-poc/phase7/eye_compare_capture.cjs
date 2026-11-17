const puppeteer = require("puppeteer");
async function capture(avatar, outFile) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 500, height: 500 });
  await page.goto(`http://localhost:8924/phase7/eye_compare.html?avatar=${avatar}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 30; i++) {
    const s = await page.evaluate(() => document.getElementById("status").textContent);
    if (s === "ready" || s.startsWith("ERROR")) { console.log(outFile, "status:", s); break; }
    await new Promise((r) => setTimeout(r, 300));
  }
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: outFile });
  await browser.close();
}
(async () => {
  await capture("eyes_original_test.glb", "phase7/eye_compare_ORIGINAL.png");
  await capture("eyes_desaturated_test.glb", "phase7/eye_compare_DESATURATED.png");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

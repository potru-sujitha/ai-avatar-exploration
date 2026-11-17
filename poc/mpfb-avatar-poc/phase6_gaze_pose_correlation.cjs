const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/poc.html?avatar=avatar_v4.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 60; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  const results = [];
  for (let i = 0; i < 12; i++) {
    const r = await page.evaluate(() => {
      const h = window.__head;
      const poseBefore = {
        bodyRotateY: h.getValue("bodyRotateY"),
        headRotateY: h.getValue("headRotateY"),
        bodyRotateX: h.getValue("bodyRotateX"),
      };
      h.lookAt(5, 380, 1200);
      const lookatEntry = h.animQueue.find((x) => x.template && x.template.name === "lookat");
      const computedTarget = lookatEntry ? lookatEntry.vs.eyeLookOutLeft : null;
      return { poseBefore, computedTarget };
    });
    results.push(r);
    await new Promise((r2) => setTimeout(r2, 1100)); // let gaze fully settle/expire before next trial
  }

  console.log(JSON.stringify(results, null, 1));
  const zeroTargets = results.filter((r) => r.computedTarget && r.computedTarget[1] !== null && Math.abs(r.computedTarget[1]) < 0.1);
  console.log(`\nCalls where lookAt() itself computed a near-zero target: ${zeroTargets.length}/${results.length}`);
  console.log("Correlation check -- bodyRotateY at call time for zero-target vs non-zero-target calls:");
  console.log("zero-target bodyRotateY values:", zeroTargets.map(r => r.poseBefore.bodyRotateY));
  const nonZero = results.filter((r) => !zeroTargets.includes(r));
  console.log("non-zero-target bodyRotateY values:", nonZero.map(r => r.poseBefore.bodyRotateY));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

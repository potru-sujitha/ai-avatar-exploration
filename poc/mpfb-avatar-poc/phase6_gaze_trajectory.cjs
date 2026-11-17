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

  console.log("--- RUN A (sampling every 100ms from Node side, 2s window) ---");
  await page.evaluate(() => { window.__head.lookAt(5, 380, 1500); });
  for (let i = 0; i < 20; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      const eyesEntry = h.animQueue.find((x) => x.template && x.template.name === "eyes");
      const lookatEntry = h.animQueue.find((x) => x.template && x.template.name === "lookat");
      return {
        eyeLookOutLeft: h.getValue("eyeLookOutLeft"),
        idxEyes: h.animQueue.indexOf(eyesEntry),
        idxLookat: h.animQueue.indexOf(lookatEntry),
        lookatVsRaw: lookatEntry ? lookatEntry.vs.eyeLookOutLeft : null,
        eyesVsRaw: eyesEntry ? eyesEntry.vs.eyeLookOutLeft : null,
      };
    });
    console.log(`t=${i * 100}ms`, JSON.stringify(v));
    await new Promise((r) => setTimeout(r, 100));
  }

  await new Promise((r) => setTimeout(r, 1000)); // let it fully settle back to idle

  console.log("--- RUN B (same, second attempt, same session) ---");
  await page.evaluate(() => { window.__head.lookAt(5, 380, 1500); });
  for (let i = 0; i < 20; i++) {
    const v = await page.evaluate(() => {
      const h = window.__head;
      const eyesEntry = h.animQueue.find((x) => x.template && x.template.name === "eyes");
      const lookatEntry = h.animQueue.find((x) => x.template && x.template.name === "lookat");
      return {
        eyeLookOutLeft: h.getValue("eyeLookOutLeft"),
        idxEyes: h.animQueue.indexOf(eyesEntry),
        idxLookat: h.animQueue.indexOf(lookatEntry),
        lookatVsRaw: lookatEntry ? lookatEntry.vs.eyeLookOutLeft : null,
        eyesVsRaw: eyesEntry ? eyesEntry.vs.eyeLookOutLeft : null,
      };
    });
    console.log(`t=${i * 100}ms`, JSON.stringify(v));
    await new Promise((r) => setTimeout(r, 100));
  }

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

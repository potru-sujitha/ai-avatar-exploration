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

  // Disable the idle "eyes" wander template's eye-contact/random-gaze competition by zeroing
  // avatarIdleEyeContact probability is not directly exposed pre-load, so instead: directly
  // inspect the animQueue for a 'eyes' template entry and log its live vs values alongside
  // the 'lookat' entry's, sampled every ~50ms across a 2s window right after calling lookAt().
  const trace = await page.evaluate(async () => {
    const h = window.__head;
    h.lookAt(5, 380, 1500); // far-left target, per the pattern already proven to work earlier
    const samples = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 2000) {
      const eyesEntry = h.animQueue.find((x) => x.template && x.template.name === "eyes");
      const lookatEntry = h.animQueue.find((x) => x.template && x.template.name === "lookat");
      samples.push({
        t: Math.round(performance.now() - t0),
        eyeLookOutLeft: h.getValue("eyeLookOutLeft"),
        eyeLookInRight: h.getValue("eyeLookInRight"),
        eyesEntryPresent: !!eyesEntry,
        eyesEntryVsKeys: eyesEntry ? Object.keys(eyesEntry.vs) : null,
        lookatEntryPresent: !!lookatEntry,
        queueIndexEyes: h.animQueue.indexOf(eyesEntry),
        queueIndexLookat: h.animQueue.indexOf(lookatEntry),
        queueLength: h.animQueue.length,
      });
      await new Promise((r) => setTimeout(r, 50));
    }
    return samples;
  });

  console.log("TRACE (first 10 + last 10 of", trace.length, "samples):");
  console.log(JSON.stringify(trace.slice(0, 10), null, 1));
  console.log("...");
  console.log(JSON.stringify(trace.slice(-10), null, 1));

  // Characterize failure rate properly: 10 fresh lookAt() calls, fresh page each time would be
  // slow; instead do 10 fresh calls in the SAME session (clearer signal for a timing race,
  // since a fresh page would also reset the idle eye-wander's own random phase each time).
  const repeated = [];
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => { window.__head.lookAt(5, 380, 1200); });
    await new Promise((r) => setTimeout(r, 900));
    const v = await page.evaluate(() => ({
      eyeLookOutLeft: window.__head.getValue("eyeLookOutLeft"),
      eyeLookInRight: window.__head.getValue("eyeLookInRight"),
    }));
    repeated.push(v);
    await new Promise((r) => setTimeout(r, 400)); // let it settle back before next call
  }
  console.log("REPEATED (10x, same session):", JSON.stringify(repeated));
  const passCount = repeated.filter((r) => (r.eyeLookOutLeft || 0) > 0.1).length;
  console.log(`PASS RATE: ${passCount}/10`);

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

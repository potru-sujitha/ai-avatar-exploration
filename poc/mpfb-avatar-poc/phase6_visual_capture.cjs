const puppeteer = require("puppeteer");

async function waitReady(page) {
  let status = "";
  for (let i = 0; i < 60; i++) {
    status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  return status;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.setViewport({ width: 940, height: 760 });
  await page.goto("http://localhost:8924/poc.html?avatar=avatar_v4.glb", { waitUntil: "domcontentloaded", timeout: 30000 });
  const status = await waitReady(page);
  console.log("LOAD STATUS:", status);

  // 1. Front-facing neutral, upper body view (default)
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: "phase6_01_front_neutral.png" });
  console.log("captured 01_front_neutral");

  // 2. Full upper-body view with business attire (wider 'mid' framing)
  await page.evaluate(() => { window.__head.setView('mid'); });
  await new Promise((r) => setTimeout(r, 1300)); // camera tween is up to 1000ms, Phase 5 likely didn't wait long enough
  await page.screenshot({ path: "phase6_02_upper_body_mid.png" });
  console.log("captured 02_upper_body_mid");

  // back to upper for the rest
  await page.evaluate(() => { window.__head.setView('upper'); });
  await new Promise((r) => setTimeout(r, 1300));

  // 3. Three-quarter view (rotate armature)
  await page.evaluate(() => { window.__head.armature.rotation.y = -0.5; });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase6_03_three_quarter.png" });
  console.log("captured 03_three_quarter");

  // 4. Side profile
  await page.evaluate(() => { window.__head.armature.rotation.y = -1.45; });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "phase6_04_side_profile.png" });
  console.log("captured 04_side_profile");

  // reset rotation
  await page.evaluate(() => { window.__head.armature.rotation.y = 0; });
  await new Promise((r) => setTimeout(r, 300));

  // 5. Face close-up (head view, zoomed in, proper wait for tween)
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: -1.7 }); });
  await new Promise((r) => setTimeout(r, 1300));
  await page.screenshot({ path: "phase6_05_face_closeup.png" });
  console.log("captured 05_face_closeup");

  // 6. Eyes and eyebrows close-up (tighter zoom, framed slightly high)
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: -1.9, cameraY: 0.22 }); });
  await new Promise((r) => setTimeout(r, 1300));
  await page.screenshot({ path: "phase6_06_eyes_closeup.png" });
  console.log("captured 06_eyes_closeup");

  // 7. Mouth and teeth close-up (tighter zoom, framed slightly low; open mouth via a jaw-open morph if available for the teeth to be visible)
  await page.evaluate(() => { window.__head.setView('head', { cameraDistance: -1.9, cameraY: -0.25 }); });
  await new Promise((r) => setTimeout(r, 1300));
  await page.screenshot({ path: "phase6_07_mouth_closeup_closed.png" });
  console.log("captured 07_mouth_closeup_closed");

  // also grab the mouth open (mid-speech) for teeth visibility
  await page.evaluate(() => { window.__head.setValue && window.__head.setValue('viseme_aa', 0.8); });
  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: "phase6_07b_mouth_closeup_open.png" });
  console.log("captured 07b_mouth_closeup_open");

  // reset view
  await page.evaluate(() => { window.__head.setView('upper'); });
  await new Promise((r) => setTimeout(r, 1300));

  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

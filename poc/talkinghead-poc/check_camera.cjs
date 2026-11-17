const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.goto("http://localhost:8923/poc2.html", { waitUntil: "domcontentloaded", timeout: 30000 });
  for (let i = 0; i < 40; i++) {
    const status = await page.evaluate(() => document.getElementById("status").textContent);
    if (status.includes("ready")) break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const info = await page.evaluate(() => {
    const h = window.__head;
    return { hasCamera: !!h.camera, hasObjLeftEye: !!h.objectLeftEye, hasObjRightEye: !!h.objectRightEye, hasNodeAvatar: !!h.nodeAvatar };
  });
  console.log(info);
  await page.evaluate(() => { window.__head.lookAt(50, 50, 1500); });
  await new Promise((r) => setTimeout(r, 1000));
  const after = await page.evaluate(() => {
    const h = window.__head;
    return { eyeLookOutLeft: h.getValue('eyeLookOutLeft'), eyeLookInLeft: h.getValue('eyeLookInLeft'), eyesLookUp: h.getValue('eyesLookUp'), eyesLookDown: h.getValue('eyesLookDown') };
  });
  console.log(after);
  await browser.close();
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

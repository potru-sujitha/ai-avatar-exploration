const puppeteer = require("puppeteer");
const sharp = require("sharp");

async function capture(avatarFile, outPng) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 940, height: 760 });
  await page.goto(`http://localhost:8924/phase18-demo.html?avatar=./${avatarFile}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    ready = await page.evaluate(() => window.__ready === true).catch(() => false);
    if (ready) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: outPng });
  await browser.close();
  return ready;
}

(async () => {
  console.log("v10 ready:", await capture("avatar_v10.glb", "phase18_controlled_v10.png"));
  console.log("v11 ready:", await capture("avatar_v11.glb", "phase18_controlled_v11.png"));

  for (const [label, file] of [["v10", "phase18_controlled_v10.png"], ["v11", "phase18_controlled_v11.png"]]) {
    const img = sharp(file);
    const forehead = await img.clone().extract({ left: 420, top: 330, width: 30, height: 20 }).raw().toBuffer({resolveWithObject:true});
    const hair = await img.clone().extract({ left: 430, top: 160, width: 30, height: 20 }).raw().toBuffer({resolveWithObject:true});
    const avgRGB = (buf) => { let r=0,g=0,b=0,n=0,c=buf.info.channels; for(let i=0;i<buf.data.length;i+=c){r+=buf.data[i];g+=buf.data[i+1];b+=buf.data[i+2];n++;} return [r/n,g/n,b/n].map(x=>x.toFixed(1)); };
    console.log(label, "forehead avgRGB:", avgRGB(forehead), "hair avgRGB:", avgRGB(hair));
  }
})().catch(e => { console.error("FATAL", e); process.exit(1); });

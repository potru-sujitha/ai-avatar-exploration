const puppeteer = require("puppeteer");

async function capture(glbFile, outFile) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 500, height: 500 });
  const html = `<!DOCTYPE html><html><head><style>body,html{margin:0;background:#303030;}</style>
  <script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.186.0/examples/jsm/"}}</script>
  </head><body><div id="c"></div><div id="status">loading</div>
  <script type="module">
  import * as THREE from "three";
  import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x303030);
  const camera = new THREE.PerspectiveCamera(25, 1, 0.01, 10);
  camera.position.set(0.03, 1.502, 1.55);
  camera.lookAt(0.03, 1.502, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(500, 500);
  document.getElementById('c').appendChild(renderer.domElement);
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const dir = new THREE.DirectionalLight(0xffffff, 2.2);
  dir.position.set(1, 2, 2);
  scene.add(dir);
  const loader = new GLTFLoader();
  loader.load('./${glbFile}', (gltf) => {
    scene.add(gltf.scene);
    renderer.render(scene, camera);
    document.getElementById('status').textContent = 'ready';
  });
  </script></body></html>`;
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await page.goto(`http://localhost:8924/_inline`, { timeout: 1000 }).catch(() => {});
  for (let i = 0; i < 30; i++) {
    const s = await page.evaluate(() => document.getElementById("status")?.textContent || "");
    if (s === "ready") break;
    await new Promise((r) => setTimeout(r, 300));
  }
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: outFile });
  await browser.close();
}

(async () => {
  await capture("eyes_original_test.glb", "phase7/eye_compare_ORIGINAL.png");
  console.log("captured original");
  await capture("eyes_desaturated_test.glb", "phase7/eye_compare_DESATURATED.png");
  console.log("captured desaturated");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });

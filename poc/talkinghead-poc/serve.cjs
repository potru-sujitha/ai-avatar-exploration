const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".glb": "model/gltf-binary", ".wav": "audio/wav",
  ".bin": "application/octet-stream", ".jpg": "image/jpeg", ".png": "image/png",
};

http.createServer((req, res) => {
  const filePath = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end("not found: " + filePath); return; }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}).listen(8923, () => console.log("serving " + ROOT + " on http://localhost:8923"));

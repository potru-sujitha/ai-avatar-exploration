const http = require("http");
const fs = require("fs");
const path = require("path");
const ROOT = __dirname;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".glb": "model/gltf-binary" };
http.createServer((req, res) => {
  const fp = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end("not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(fp)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(8925, () => console.log("serving on 8925"));

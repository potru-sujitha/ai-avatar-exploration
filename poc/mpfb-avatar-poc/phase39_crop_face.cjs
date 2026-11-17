const { createCanvas, loadImage } = (() => { try { return require('canvas'); } catch(e) { return null; } })();
console.log(createCanvas ? "canvas available" : "no canvas module");

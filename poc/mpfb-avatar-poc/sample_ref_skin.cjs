const sharp = require("sharp");
const p = String.raw`C:\Users\Admin\AppData\Local\Temp\claude\4ac09b708672bd50\f2a71e2b-0f38-4151-88c4-375f40f07b0c\images\14.png`;
function rgbToLab(r,g,b){
  const f=(c)=>{c/=255;return c>0.04045?Math.pow((c+0.055)/1.055,2.4):c/12.92;};
  const [R,G,B]=[f(r),f(g),f(b)];
  const X=R*0.4124+G*0.3576+B*0.1805, Y=R*0.2126+G*0.7152+B*0.0722, Z=R*0.0193+G*0.1192+B*0.9505;
  const Xn=0.95047,Yn=1.0,Zn=1.08883;
  const g2=(t)=>t>0.008856?Math.cbrt(t):(7.787*t+16/116);
  const fx=g2(X/Xn),fy=g2(Y/Yn),fz=g2(Z/Zn);
  return [116*fy-16, 500*(fx-fy), 200*(fy-fz)];
}
(async () => {
  const meta = await sharp(p).metadata();
  console.log("dims:", meta.width, meta.height);
  // cheek area, roughly center-left of face in this portrait crop
  const box = { left: Math.round(meta.width*0.30), top: Math.round(meta.height*0.45), width: Math.round(meta.width*0.1), height: Math.round(meta.height*0.08) };
  const { data, info } = await sharp(p).extract(box).raw().toBuffer({ resolveWithObject: true });
  let sr=0,sg=0,sb=0,n=0;
  for (let i=0;i<data.length;i+=info.channels){ sr+=data[i]; sg+=data[i+1]; sb+=data[i+2]; n++; }
  const r=sr/n,g=sg/n,b=sb/n;
  console.log("reference cheek sample RGB:", Math.round(r), Math.round(g), Math.round(b));
  console.log("reference cheek sample Lab:", JSON.stringify(rgbToLab(r,g,b)));
})();

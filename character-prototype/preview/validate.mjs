import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Spring,makeMesh,demoInput} from './rig.mjs';
const config=JSON.parse(fs.readFileSync(new URL('./mesh.json',import.meta.url)));
const report={date:new Date().toISOString(),scope:'Desktop mesh and spring numerical acceptance only; not phone validation',cases:[]};
for(const [name,settings] of Object.entries(config.springs)){
  for(const fps of [30,60,120]){
    const s=new Spring(settings);let peak=0,crossings=0,last=0;
    for(let i=0;i<fps*8;i++){
      const t=i/fps,force=t<0.15?500:0;
      const x=s.step(force,1/fps);assert(Number.isFinite(x));assert(Math.abs(x)<=settings.limit+1e-7);
      peak=Math.max(peak,Math.abs(x));if(t>0.2&&x*last<0)crossings++;last=x;
    }
    assert(peak>0.01);assert(Math.abs(s.x)<0.001);assert(Math.abs(s.v)<0.01);
    report.cases.push({name,fps,peak,crossings,finalPosition:s.x,finalVelocity:s.v,passed:true});
  }
}
for(const t of [3.2,4.2,4.8])assert.deepEqual([demoInput(t).x,demoInput(t).y],[0.72,-0.3]);
report.cases.push({name:'tilt hold input stays fixed',passed:true});
const mesh=makeMesh([[0,0],[1086,0],[1086,1448],[0,1448]],[],config.limits.triangleEdgePixels);
let area=0,minArea=Infinity,maxEdge=0;
for(let i=0;i<mesh.length;i+=6){
  const [ax,ay,bx,by,cx,cy]=mesh.slice(i,i+6),a=Math.abs((bx-ax)*(cy-ay)-(by-ay)*(cx-ax))/2;
  minArea=Math.min(minArea,a);area+=a;maxEdge=Math.max(maxEdge,Math.hypot(ax-bx,ay-by),Math.hypot(bx-cx,by-cy),Math.hypot(cx-ax,cy-ay));
}
assert(minArea>0);assert(Math.abs(area-1086*1448)<1);assert(maxEdge<=config.limits.triangleEdgePixels+0.001);
report.cases.push({name:'nondegenerate full coverage mesh',triangles:mesh.length/6,area,minArea,maxEdge,passed:true});
fs.mkdirSync(new URL('../artifacts/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../artifacts/numerical-validation.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));

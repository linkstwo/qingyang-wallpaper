// Negative regression + independent hard-limit signs, with real mesh and production CPU geometry.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {makeMesh} from '../character-prototype/preview/rig.mjs';
import {contactWeights} from '../character-prototype/preview/contact-rig.mjs';
import * as current from '../character-prototype/preview/structure.mjs';
const BASE='ab69656ada60996787f89df31818d48051a207d9';
const baseline=await import('data:text/javascript;base64,'+Buffer.from(execFileSync('git',['show',BASE+':character-prototype/preview/structure.mjs'])).toString('base64'));
const config=JSON.parse(fs.readFileSync(new URL('../character-prototype/preview/mesh.json',import.meta.url)));
const v=makeMesh([[0,0],[1086,0],[1086,1448],[0,1448]],[],config.limits.triangleEdgePixels),z=current.depthWeights(v),pins=contactWeights(v);
// Deduplicate repeated vertices for exhaustive control signs, not for production geometry.
const index=new Map(),points=[],indices=[];
for(let i=0;i<z.length;i++){
 const x=v[2*i],y=v[2*i+1],key=x+','+y;
 if(!index.has(key)){index.set(key,points.length);points.push({x,y,z:z[i],pin:pins[i]});}
 indices.push(index.get(key));
}
const triangles=[],hairTriangles=[];
for(let i=0;i<indices.length;i+=3){
 const ids=indices.slice(i,i+3),[a,b,c]=ids.map(n=>points[n]);
 const den=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),triangle={ids,den};triangles.push(triangle);
 if([a,b,c].some(p=>p.x>=80&&p.x<=450&&p.y>=250&&p.y<=680))hairTriangles.push(triangle);
}
const hairIndices=[...new Set(hairTriangles.flatMap(t=>t.ids))];
function scan(model,triangles,selected,view,body,chest,hair,gain,spatial){
 const q=[];
 for(const i of selected){const p=points[i];q[i]=model.deformPoint(p.x,p.y,p.z,view,body,chest,hair,gain,p.pin,spatial);}
 let min=Infinity;
 for(const {ids:[ia,ib,ic],den}of triangles){const a=q[ia],b=q[ib],c=q[ic];min=Math.min(min,((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/den);}
 return min;
}
const fullIndices=points.map((_,i)=>i);
const negative=scan(baseline,triangles,fullIndices,[1,-1],[6,6],[11.9,11.9,10.2],[21,10.5],1.45,true);
assert.ok(negative<-.5,'original full-mesh fold must be reproduced before checking repair');
let minFull=Infinity,fullCases=0;
for(const vx of [-1,0,1])for(const vy of [-1,1])for(const sx of [-1,1])for(const sy of [-1,1])for(const amplitude of [0,.25,.5,.75,1])for(const spatial of [false,true]){
 const ratio=scan(current,triangles,fullIndices,[vx,vy],[6*sx,6*sy],[11.9*sx,11.9*sy,10.2*sx],[21*sx*amplitude,10.5*sy*amplitude],1.45,spatial);
 assert.ok(ratio>.1,JSON.stringify({test:'full',ratio,vx,vy,sx,sy,amplitude,spatial}));minFull=Math.min(minFull,ratio);fullCases++;
}
console.log('PASS full mesh:',fullCases,'cases, minimum area ratio',minFull);
let minHair=Infinity,independentCases=0,worst=null;
for(const vx of [-1,0,1])for(const vy of [-1,0,1])for(const spatial of [false,true])for(const gain of [1,1.45])for(let bits=0;bits<128;bits++){
 const sign=i=>bits&(1<<i)?1:-1;
 const ratio=scan(current,hairTriangles,hairIndices,[vx,vy],[6*sign(0),6*sign(1)],[11.9*sign(2),11.9*sign(3),10.2*sign(4)],[21*sign(5),10.5*sign(6)],gain,spatial);
 if(ratio<minHair){minHair=ratio;worst={vx,vy,spatial,gain,bits};}
 assert.ok(ratio>.1,JSON.stringify({test:'independent hair signs',ratio,vx,vy,spatial,gain,bits}));independentCases++;
}
// Centreline motion through the visible tip stays exactly at the prior response.
let maxCentrelineDifference=0;
for(let y=285;y<=480;y+=5){const t=Math.max(0,Math.min(1,(y-275)/205)),x=191+53*t;
 for(const view of [[0,0],[1,-1],[-1,1]]){
  const args=[x,y,current.depthAt(x,y),view,[1,-.5],[2,-1,.4],[4,2],1.45];
  const a=baseline.deformPoint(...args),b=current.deformPoint(...args);maxCentrelineDifference=Math.max(maxCentrelineDifference,Math.hypot(a[0]-b[0],a[1]-b[1]));
 }
}
assert.ok(maxCentrelineDifference<1e-9,'do not remove normal centreline movement to pass the extreme scan');
assert.equal(current.hairWeight(200,260),0,'roots stay fixed');
assert.ok(current.hairWeight(392,333)<1e-9,'face/glasses remain outside the hair envelope');
assert.equal(current.hairWeight(244,650),0,'release ends continuously before the arm/paper region');
assert.equal(current.hairWeight(244,480),1,'visible free tip retains full weight');
const result={baseline:BASE,negativeBaselineArea:negative,fullMeshCases:fullCases,minFullAreaRatio:minFull,hairRegionTriangles:hairTriangles.length,independentHairCases:independentCases,minIndependentHairAreaRatio:minHair,worst,maxCentrelineDifference,hairEnvelope:current.structure.hairEnvelope,phoneTested:false};
fs.writeFileSync(new URL('../validation/hair-safety.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));

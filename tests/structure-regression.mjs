import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeMesh} from '../character-prototype/preview/rig.mjs';
import {contactWeights} from '../character-prototype/preview/contact-rig.mjs';
import {depthAt,depthWeights,projectPoint,deformPoint,structure} from '../character-prototype/preview/structure.mjs';
const config=JSON.parse(fs.readFileSync(new URL('../character-prototype/preview/mesh.json',import.meta.url)));
const vertices=makeMesh([[0,0],[1086,0],[1086,1448],[0,1448]],[],config.limits.triangleEdgePixels);
const depths=depthWeights(vertices),pins=contactWeights(vertices);
const raw=fs.readFileSync(new URL('../android-app/app/src/main/assets/character_depth.bin',import.meta.url));
assert.equal(raw.length,depths.length*4);
for(let i=0;i<depths.length;i++)assert.equal(raw.readFloatLE(i*4),depths[i],'Android/Web depth assets must agree');
const area=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
let minArea=Infinity,maxArea=0,maxTravel=0,pinnedError=0;
for(const vx of [-1,-.5,0,.5,1])for(const vy of [-1,-.5,0,.5,1]){
 const points=[];
 for(let i=0;i<depths.length;i++){
  const x=vertices[2*i],y=vertices[2*i+1],q=projectPoint(x,y,depths[i],vx,vy,pins[i]);points.push(q);
  assert.ok(q.every(Number.isFinite));
  const travel=Math.hypot(q[0]-x,q[1]-y);maxTravel=Math.max(maxTravel,travel);
  if(pins[i]===1)pinnedError=Math.max(pinnedError,travel);
  if(vx===0&&vy===0)assert.ok(travel<1e-9,'neutral view must preserve the source geometry');
 }
 for(let i=0;i<depths.length;i+=3){
  const before=[0,1,2].map(n=>[vertices[2*(i+n)],vertices[2*(i+n)+1]]);
  const ratio=area(...points.slice(i,i+3))/area(...before);
  minArea=Math.min(minArea,ratio);maxArea=Math.max(maxArea,ratio);
  assert.ok(ratio>.2&&ratio<2.5,JSON.stringify({ratio,vx,vy,before,after:points.slice(i,i+3)}));
 }
}
assert.equal(pinnedError,0,'paper, hands and seated supports must stay fixed');
const near=projectPoint(575,785,depthAt(575,785),1,0),far=projectPoint(930,790,depthAt(930,790),1,0);
assert.ok(Math.abs((near[0]-575)-(far[0]-930))>5,'depth must produce differential parallax, not rigid image translation');
let minCoupled=Infinity,maxCoupled=0;
for(const vx of [-1,0,1])for(const vy of [-1,1])for(const sign of [-1,1]){
 const points=[];
 for(let i=0;i<depths.length;i++){
  const x=vertices[2*i],y=vertices[2*i+1];
  const q=deformPoint(x,y,depths[i],[vx,vy],[2*sign,sign],[6*sign,-4*sign,3*sign],[12*sign,4*sign],1.45,pins[i]);points.push(q);
  if(pins[i]===1)assert.deepEqual(q,[x,y],'3-axis inertia must preserve contact constraints');
 }
 for(let i=0;i<depths.length;i+=3){
  const before=[0,1,2].map(n=>[vertices[2*(i+n)],vertices[2*(i+n)+1]]);
  const ratio=area(...points.slice(i,i+3))/area(...before);minCoupled=Math.min(minCoupled,ratio);maxCoupled=Math.max(maxCoupled,ratio);
  assert.ok(ratio>.12&&ratio<2.8,JSON.stringify({ratio,vx,vy,sign,before}));
 }
}
const metrics={triangles:vertices.length/6,vertices:depths.length,depthMin:Math.min(...depths),depthMax:Math.max(...depths),minAreaRatio:minArea,maxAreaRatio:maxArea,maxTravel,pinnedError,minCoupledAreaRatio:minCoupled,maxCoupledAreaRatio:maxCoupled,phoneTested:false,structure};
fs.writeFileSync(new URL('../validation/structure.json',import.meta.url),JSON.stringify(metrics,null,2)+'\n');
console.log(JSON.stringify(metrics));

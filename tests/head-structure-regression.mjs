import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const baselineSource=execFileSync('git',['show','101814578b9fa09be50f2d642f1cc79dea83e222:character-prototype/preview/structure.mjs'],{encoding:'utf8'});
const baseline=await import('data:text/javascript;base64,'+Buffer.from(baselineSource).toString('base64'));
let baselineDistanceError=0;
import {depthAt,projectPoint,deformPoint,headWeight} from '../character-prototype/preview/structure.mjs';
const face=[[350,290],[430,280],[500,335],[420,390]];
let maxDistanceError=0,maxNeutralError=0,maxBoundaryJump=0;
for(const vx of [-1,-.5,0,.5,1])for(const vy of [-1,-.5,0,.5,1]){
 for(const moving of [false,true]){
  const q=face.map(([x,y])=>deformPoint(x,y,depthAt(x,y),[vx,vy],moving?[2,-1]:[0,0],moving?[6,-4,3]:[0,0,0],[0,0],1.45));
  const old=face.map(([x,y])=>baseline.deformPoint(x,y,baseline.depthAt(x,y),[vx,vy],moving?[2,-1]:[0,0],moving?[6,-4,3]:[0,0,0],[0,0],1.45));
  for(let i=0;i<face.length;i++)for(let j=i+1;j<face.length;j++){
   const distance=p=>Math.hypot(p[i][0]-p[j][0],p[i][1]-p[j][1]);
   baselineDistanceError=Math.max(baselineDistanceError,Math.abs(distance(face)-distance(old)));
   maxDistanceError=Math.max(maxDistanceError,Math.abs(distance(face)-distance(q)));
  }
 }
 for(const y of [395,565])for(const x of [250,430,630,815]){
  const a=projectPoint(x,y-1e-4,depthAt(x,y-1e-4),vx,vy);
  const b=projectPoint(x,y+1e-4,depthAt(x,y+1e-4),vx,vy);
  maxBoundaryJump=Math.max(maxBoundaryJump,Math.hypot(a[0]-b[0],a[1]-b[1]));
 }
}
for(let y=0;y<=1448;y+=16)for(let x=0;x<=1086;x+=16){
 const q=projectPoint(x,y,depthAt(x,y),0,0);
 maxNeutralError=Math.max(maxNeutralError,Math.hypot(q[0]-x,q[1]-y));
}
assert.ok(maxDistanceError<1e-9,'head must preserve facial distances with body and tissue inertia');
assert.ok(maxNeutralError<1e-9,'neutral pose must match source');
assert.ok(maxBoundaryJump<.001,'head/neck blend must be continuous');
assert.equal(headWeight(395),1);assert.equal(headWeight(565),0);
assert.ok(baselineDistanceError>1,"baseline must reproduce non-rigid facial deformation");
const metrics={anglePairs:25,baselineDistanceError,maxDistanceError,maxNeutralError,maxBoundaryJump,phoneTested:false};
fs.writeFileSync(new URL('../validation/head-structure.json',import.meta.url),JSON.stringify(metrics,null,2)+'\n');
console.log(JSON.stringify(metrics));

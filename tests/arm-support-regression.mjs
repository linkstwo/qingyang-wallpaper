import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {structure,depthAt,projectPoint,deformPoint,armWeights,solveArm} from '../character-prototype/preview/structure.mjs';
const source=execFileSync('git',['show','650438f9124caa541dcba4249910fea9772d77b3:character-prototype/preview/structure.mjs'],{encoding:'utf8'});
const old=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const {shoulder:s,elbow:e,wrist:w}=structure.armSupport;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
let maxBoneError=0,baselineBoneError=0,maxWristDrift=0,maxNeutralError=0,unreachable=0,cases=0;
for(const vx of [-1,-.5,0,.5,1])for(const vy of [-1,-.5,0,.5,1])for(const bx of [-6,0,6])for(const by of [-6,0,6])for(const spatial of [false,true]){
 const args=[[vx,vy],[bx,by],[11.9,-11.9,10.2],[21,10.5],1.45,0,spatial];
 const q=[s,e,w].map(([x,y])=>deformPoint(x,y,depthAt(x,y),...args));
 const prev=[s,e,w].map(([x,y])=>old.deformPoint(x,y,depthAt(x,y),...args));
 const pose=solveArm(q[0]);if(!pose.reachable)unreachable++;
 for(const [a,b] of [[0,1],[1,2]]){
  const rest=dist([s,e,w][a],[s,e,w][b]);
  maxBoneError=Math.max(maxBoneError,Math.abs(dist(q[a],q[b])-rest));
  baselineBoneError=Math.max(baselineBoneError,Math.abs(dist(prev[a],prev[b])-rest));
 }
 maxWristDrift=Math.max(maxWristDrift,dist(q[2],w));cases++;
}
let maxTissueLeak=0,baselineTissueLeak=0;
for(const [x,y] of [[815,800],[815,1010],[600,1086]]){
 assert.equal(armWeights(x,y)[2],1);
 const args=[[1,-1],[0,0],[11.9,-11.9,10.2],[0,0],1.45];
 maxTissueLeak=Math.max(maxTissueLeak,dist(deformPoint(x,y,depthAt(x,y),...args),projectPoint(x,y,depthAt(x,y),1,-1)));
 baselineTissueLeak=Math.max(baselineTissueLeak,dist(old.deformPoint(x,y,depthAt(x,y),...args),old.projectPoint(x,y,depthAt(x,y),1,-1)));
}
const chest=deformPoint(577,785,depthAt(577,785),[0,0],[0,0],[8,0,0],[0,0],1.45);
assert.ok(dist(chest,[577,785])>5,'local tissue must keep responding outside supported arm');
for(let y=0;y<1448;y+=16)for(let x=0;x<1086;x+=16){const q=projectPoint(x,y,depthAt(x,y),0,0);maxNeutralError=Math.max(maxNeutralError,dist(q,[x,y]));}
assert.ok(maxBoneError<1e-9,'projected chain lengths must stay fixed');
assert.ok(maxWristDrift<1e-9,'wrist must remain at the existing paper contact');
assert.ok(maxNeutralError<1e-9);assert.ok(maxTissueLeak<1e-9);assert.equal(unreachable,0);
assert.ok(baselineBoneError>1);assert.ok(baselineTissueLeak>.01);
const metrics={cases,maxBoneError,baselineBoneError,maxWristDrift,maxNeutralError,maxTissueLeak,baselineTissueLeak,unreachable,phoneTested:false};
fs.writeFileSync(new URL('../validation/arm-support.json',import.meta.url),JSON.stringify(metrics,null,2)+'\n');console.log(JSON.stringify(metrics));

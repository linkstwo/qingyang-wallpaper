// Explicit diagnostic: simultaneous spring hard limits can still fold the existing hair tip.
// Do not describe this scan as an all-mesh pass; record the inherited limit separately.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {makeMesh} from '../character-prototype/preview/rig.mjs';
import {contactWeights} from '../character-prototype/preview/contact-rig.mjs';
import * as current from '../character-prototype/preview/structure.mjs';
const baseline=await import('data:text/javascript;base64,'+Buffer.from(execFileSync('git',['show','650438f9124caa541dcba4249910fea9772d77b3:character-prototype/preview/structure.mjs'])).toString('base64'));
const config=JSON.parse(fs.readFileSync(new URL('../character-prototype/preview/mesh.json',import.meta.url)));
const v=makeMesh([[0,0],[1086,0],[1086,1448],[0,1448]],[],config.limits.triangleEdgePixels),z=current.depthWeights(v),pins=contactWeights(v),results=[];
for(const [name,model] of [['baseline',baseline],['current',current]]){
 let minArea=Infinity,minArmArea=Infinity,worst=null,cases=0;
 for(const vx of [-1,0,1])for(const vy of [-1,1])for(const sx of [-1,1])for(const sy of [-1,1]){
  const q=[];
  for(let i=0;i<z.length;i++)q.push(model.deformPoint(v[2*i],v[2*i+1],z[i],[vx,vy],[6*sx,6*sy],[11.9*sx,11.9*sy,10.2*sx],[21*sx,10.5*sy],1.45,pins[i]));
  for(let i=0;i<z.length;i+=3){
   const a=q[i],b=q[i+1],c=q[i+2];
   const den=(v[2*i+2]-v[2*i])*(v[2*i+5]-v[2*i+1])-(v[2*i+3]-v[2*i+1])*(v[2*i+4]-v[2*i]);
   const ratio=((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/den;
   if(ratio<minArea){minArea=ratio;worst={x:v[2*i],y:v[2*i+1],vx,vy,sx,sy};}
   if(current.armWeights(v[2*i],v[2*i+1])[2]>0)minArmArea=Math.min(minArmArea,ratio);
  }cases++;
 }
 results.push({name,cases,minArea,minArmArea,worst});
}
assert.ok(results[1].minArmArea>0,'supported arm must not fold at tested simultaneous hard limits');
assert.ok(results[1].minArea>=results[0].minArea-1e-9,'do not worsen inherited global hard-limit fold');
const result={allMeshHardLimitPassed:results[1].minArea>0,knownLimitation:'Inherited loose hair tip fold at simultaneous spring hard limits; pending repair, not phone evidence.',results,phoneTested:false};
fs.writeFileSync(new URL('../validation/arm-limit-scan.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));

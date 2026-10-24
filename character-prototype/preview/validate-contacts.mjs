import fs from 'node:fs';
import assert from 'node:assert/strict';
import {makeMesh} from './rig.mjs';
import {contactWeights,contactPin} from './contact-rig.mjs';

const mesh=makeMesh([[0,0],[1086,0],[1086,1448],[0,1448]],[],27);
const weights=contactWeights(mesh);
function sample(x,y){
  for(let i=0;i<mesh.length;i+=6){
    const [ax,ay,bx,by,cx,cy]=mesh.slice(i,i+6);
    const d=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);
    const a=((by-cy)*(x-cx)+(cx-bx)*(y-cy))/d;
    const b=((cy-ay)*(x-cx)+(ax-cx)*(y-cy))/d,c=1-a-b;
    if(Math.min(a,b,c)>=-1e-6)return a*weights[i/2]+b*weights[i/2+1]+c*weights[i/2+2];
  }
  throw Error('Point outside mesh');
}
const fixed=[['paper',120,1010],['paper edge',300,1100],['far fingers',170,920],['far palm',260,930],['near fingers',205,1190],['near palm',310,1190],['seated support',500,1400]];
const cases=[];
for(const [name,x,y] of fixed){
  const pin=sample(x,y),maxDrift=(1-pin)*60;
  assert(pin>0.9999,`${name}: ${pin}`);
  cases.push({name,source:[x,y],interpolatedPin:pin,maxDriftAt60pxInput:maxDrift});
}
// Reverse check: contacts must not freeze the face, shoulder, torso or free elbow.
for(const [name,x,y] of [['face',430,340],['shoulder',815,528],['torso',700,780],['elbow',815,1010]]){
  const pin=sample(x,y);assert(pin<0.001,`${name} frozen`);
  cases.push({name,source:[x,y],interpolatedPin:pin});
}
for(const value of weights)assert(Number.isFinite(value)&&value>=0&&value<=1);
const original=fs.readFileSync(new URL('./original.png',import.meta.url));
const report={verifiedAt:new Date().toISOString(),scope:'Interpolated GPU contact weights, not a phone or final visual acceptance',triangles:mesh.length/6,sourceTextureBytes:original.length,cases,allPassed:true};
fs.mkdirSync(new URL('../artifacts/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../artifacts/contact-validation.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));

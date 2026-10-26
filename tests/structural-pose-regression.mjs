import assert from 'node:assert/strict';import fs from 'node:fs';
import {buildConnectedProxy} from '../character-prototype/preview/connected-proxy.mjs';
import {poseConnectedProxy} from '../character-prototype/preview/structural-pose.mjs';
const m=buildConnectedProxy(),dist=(a,b)=>Math.hypot(...a.map((v,k)=>v-b[k])),cross=(a,b,c)=>{const u=b.map((v,k)=>v-a[k]),w=c.map((v,k)=>v-a[k]);return [u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];};
const neutral=poseConnectedProxy(m);assert.deepEqual(neutral.positions,m.positions);
let cases=0,triangleCases=0,minAreaRatio=Infinity,minNormalDot=Infinity,maxWristError=0,maxLengthError=0,maxPinError=0;
for(const yaw of [-.06,0,.06])for(const pitch of [-.04,0,.04])for(const roll of [-.035,0,.035]){const q=poseConnectedProxy(m,{yaw,pitch,roll});cases++;maxPinError=Math.max(maxPinError,q.maxPinnedError);
 for(const arm of q.pose.arms){assert(arm.reachable,'bounded torso pose must reach observed wrist');if(arm.wristObserved)maxWristError=Math.max(maxWristError,dist(arm.points[2],arm.rest[2]));for(let k=0;k<2;k++)maxLengthError=Math.max(maxLengthError,Math.abs(dist(arm.points[k],arm.points[k+1])-arm.lengths[k]));}
 for(let i=0;i<m.indices.length;i+=3){const ids=m.indices.slice(i,i+3),p=ids.map(j=>m.positions.slice(j*3,j*3+3)),r=ids.map(j=>q.positions.slice(j*3,j*3+3)),a=cross(...p),b=cross(...r),A=Math.hypot(...a),B=Math.hypot(...b),ratio=B/A,dot=a.reduce((v,n,k)=>v+n*b[k],0)/(A*B);assert(Number.isFinite(ratio)&&ratio>.1,JSON.stringify({yaw,pitch,roll,ratio,ids}));assert(dot>0,JSON.stringify({yaw,pitch,roll,dot,ids}));minAreaRatio=Math.min(minAreaRatio,ratio);minNormalDot=Math.min(minNormalDot,dot);triangleCases++;}}
assert(maxPinError===0&&maxWristError<1e-9&&maxLengthError<1e-9);
const r={cases,triangleCases,minAreaRatio,minNormalDot,maxWristError,maxLengthError,maxPinnedSurfaceError:maxPinError,zeroPoseExact:true,nearWristFreeBecauseUnobserved:true,cameraAndSpringSolverChanged:false,phoneTested:false};fs.writeFileSync(new URL('../validation/s2-structural-pose.json',import.meta.url),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));

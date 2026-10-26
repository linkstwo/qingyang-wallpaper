import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {sceneModel,supportDepth} from '../character-prototype/preview/scene-model.mjs';
import {subject} from '../character-prototype/preview/subject.mjs';
import {depthAt,deformPoint} from '../character-prototype/preview/structure.mjs';
import {bodyContactPin} from '../character-prototype/preview/contact-rig.mjs';
import {subtractPolygon} from '../character-prototype/preview/layered-mesh.mjs';
const assets=new URL('../android-app/app/src/main/assets/',import.meta.url),f32=b=>Float32Array.from({length:b.length/4},(_,i)=>b.readFloatLE(i*4)),mesh=f32(fs.readFileSync(new URL('character_mesh.bin',assets)));
const area=(a,b,c)=>((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;
const polyArea=p=>Math.abs(p.reduce((v,a,i)=>{const b=p[(i+1)%p.length];return v+a[0]*b[1]-a[1]*b[0];},0)/2);
// Independent area accounting catches removed skin/duplicated triangles and holes at rest.
let observedArea=0,minArea=Infinity;
for(let i=0;i<mesh.length;i+=6){const tri=[[mesh[i],mesh[i+1]],[mesh[i+2],mesh[i+3]],[mesh[i+4],mesh[i+5]]],a=Math.abs(area(...tri));assert(a>1e-6,'no degenerate cut triangles');observedArea+=a;minArea=Math.min(minArea,a);}
const expectedArea=1152*1536-polyArea(subject.paper);assert(Math.abs(observedArea-expectedArea)<.05,'body plus paper exactly covers neutral source');
// Subtracting the same polygon twice is idempotent (no paper area in body).
const twice=subtractPolygon(mesh,subject.paper);let twiceArea=0;for(let i=0;i<twice.length;i+=6)twiceArea+=Math.abs(area([twice[i],twice[i+1]],[twice[i+2],twice[i+3]],[twice[i+4],twice[i+5]]));assert(Math.abs(twiceArea-observedArea)<.25,JSON.stringify({observedArea,twiceArea,error:twiceArea-observedArea}));
assert(bodyContactPin(603,1260)===0,'paper feather must not drag neighbouring pants to paper depth');assert(bodyContactPin(330,990)===1,'holding hand stays supported');
function scan(m,depth,pin){const unique=new Map(),idx=[];for(let i=0;i<m.length;i+=2){const p=[m[i],m[i+1]],key=p.join(',');if(!unique.has(key))unique.set(key,{p,z:depth?depth[i/2]:depthAt(...p),pin:pin?pin[i/2]:bodyContactPin(...p),id:unique.size});idx.push(unique.get(key).id);}const points=[...unique.values()];let min=Infinity,worst=null,cases=0;
 for(const vx of [-1,0,1])for(const vy of [-1,0,1])for(const sign of [-1,0,1]){const view=[vx,vy],q=points.map(({p,z,pin})=>deformPoint(...p,z,view,[6*sign,-6*sign],[11.9*sign,-11.9*sign,10.2*sign],[21*sign,10.5*sign],1.45,pin,true));for(let i=0;i<idx.length;i+=3){const a=idx[i],b=idx[i+1],c=idx[i+2],ratio=area(q[a],q[b],q[c])/area(points[a].p,points[b].p,points[c].p);if(ratio<min){min=ratio;worst={point:points[a].p,view,sign};}cases++;}}return {minSignedAreaRatio:min,worst,triangleCases:cases};}
const base='e5f030342aa1029c56c76cb6ba19934e5dc8d710',old=name=>f32(execFileSync('git',['show',base+':android-app/app/src/main/assets/'+name],{maxBuffer:2e6})),oldMesh=old('character_mesh.bin'),oldDepth=old('character_depth.bin'),oldPins=old('character_pins.bin');
const original=[sceneModel.yawRadians,sceneModel.pitchRadians],ranges=[];
for(const yaw of [.04,.08,.14,.20]){sceneModel.yawRadians=yaw;sceneModel.pitchRadians=yaw/2;ranges.push({yaw,pitch:yaw/2,layered:scan(mesh)});}
sceneModel.yawRadians=.14;sceneModel.pitchRadians=.07;const oldContinuous=scan(oldMesh,oldDepth,oldPins);assert(oldContinuous.minSignedAreaRatio<0,'must reproduce old occlusion fold');
[sceneModel.yawRadians,sceneModel.pitchRadians]=original;
assert(ranges[0].layered.minSignedAreaRatio>.15,'production range safe');
assert(ranges.find(r=>r.yaw===.14).layered.minSignedAreaRatio>.15,'paper/forearm seam fold regression');
const result={topologyVersion:2,characterTriangles:mesh.length/6,paperArea:polyArea(subject.paper),neutralCoverageAreaError:observedArea-expectedArea,minSourceTriangleArea:minArea,oldContinuousAtYaw014:oldContinuous,ranges,productionViewRadians:original,hiddenBodyUnderPaperReady:false,phoneTested:false};fs.writeFileSync(new URL('../validation/s2-layered-scene.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));

import assert from 'node:assert/strict';import fs from 'node:fs';
import {buildForearmSourcePieces,forearmSurfaceDepth,segmentedFrontDepthAt} from '../character-prototype/preview/forearm-surface.mjs';
import {makeLayeredCharacterMesh} from '../character-prototype/preview/layered-mesh.mjs';
import {depthAt,deformPoint} from '../character-prototype/preview/structure.mjs';
import {projectWorld,unprojectSource,sceneModel,supportDepth} from '../character-prototype/preview/scene-model.mjs';
import {bodyContactPin} from '../character-prototype/preview/contact-rig.mjs';
const pieces=buildForearmSourcePieces(),area=(a,b,c)=>((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;
const total=mesh=>{let sum=0;for(let i=0;i<mesh.length;i+=6)sum+=Math.abs(area(...[0,2,4].map(k=>Array.from(mesh.slice(i+k,i+k+2)))));return sum;};
const areaError=total(pieces.body.source)+total(pieces.arm.source)-total(makeLayeredCharacterMesh());assert(Math.abs(areaError)<.05,`no duplicate/lost source area: ${areaError}`);
const edgeCounts=new Map();for(let i=0;i<pieces.shared.indices.length;i+=3)for(let k=0;k<3;k++){const a=pieces.shared.indices[i+k],b=pieces.shared.indices[i+(k+1)%3],key=[a,b].sort((a,b)=>a-b).join(',');edgeCounts.set(key,(edgeCounts.get(key)||0)+1);}assert([...edgeCounts.values()].every(v=>v<=2),'no nonmanifold source edges');
let maxProjectionError=0,minAreaRatio=Infinity,cases=0;const oldAngles=[sceneModel.yawRadians,sceneModel.pitchRadians],ranges=[];
try{for(const yaw of [.04,.08,.14]){sceneModel.yawRadians=yaw;sceneModel.pitchRadians=yaw/2;let rangeMin=Infinity,worst=null;
 for(const [piece,target] of [[pieces.body,depthAt],[pieces.arm,forearmSurfaceDepth]]){
  const pts=[],ids=[],map=new Map();for(let i=0;i<piece.source.length;i+=2){const p=Array.from(piece.source.slice(i,i+2)),key=p.join(',');if(!map.has(key)){const z=target(...p),q=projectWorld(unprojectSource(...p,z));maxProjectionError=Math.max(maxProjectionError,Math.hypot(q[0]-p[0],q[1]-p[1]));map.set(key,pts.length);pts.push({p,z,pin:bodyContactPin(...p)});}ids.push(map.get(key));}
  for(const vx of [-1,0,1])for(const vy of [-1,0,1])for(const sign of [-1,0,1]){const q=pts.map(({p,z,pin})=>deformPoint(...p,z,[vx,vy],[6*sign,-6*sign],[11.9*sign,-11.9*sign,10.2*sign],[21*sign,10.5*sign],1.45,pin,true));for(let i=0;i<ids.length;i+=3){const a=ids.slice(i,i+3),ratio=area(...a.map(j=>q[j]))/area(...a.map(j=>pts[j].p));if(ratio<rangeMin){rangeMin=ratio;worst={piece:piece===pieces.arm?'arm':'body',points:a.map(j=>pts[j]),vx,vy,sign};}cases++;}}
 }ranges.push({yaw,minAreaRatio:rangeMin,worst});minAreaRatio=Math.min(minAreaRatio,rangeMin);}
}finally{[sceneModel.yawRadians,sceneModel.pitchRadians]=oldAngles;}
assert(maxProjectionError<1e-8);assert(minAreaRatio>.1,JSON.stringify(ranges));
assert(Math.abs(segmentedFrontDepthAt(525.55,953.77)-180)<5,'visible forearm aligns with connected inferred front');
assert.equal(segmentedFrontDepthAt(545,870),depthAt(545,870),'shirt unchanged');assert.equal(segmentedFrontDepthAt(500,1050),depthAt(500,1050),'background unchanged');
assert.equal(forearmSurfaceDepth(350,1005),supportDepth(350,1005),'supported wrist preserved');
const report={source:pieces.source,nonmanifoldEdges:0,bodyTriangles:pieces.body.source.length/6,forearmTriangles:pieces.arm.source.length/6,areaError,maxProjectionError,ranges,minAreaRatio,triangleCases:cases,depthAtResidualBefore:depthAt(525.55,953.77),depthAtResidualAfter:segmentedFrontDepthAt(525.55,953.77),depthInferred:true,productionUsed:false,phoneTested:false};fs.writeFileSync(new URL('../validation/s2-forearm-surface.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

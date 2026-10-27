import assert from 'node:assert/strict';import fs from 'node:fs';
import {buildObservedScene} from '../character-prototype/preview/observed-scene.mjs';
import {poseConnectedProxy} from '../character-prototype/preview/structural-pose.mjs';
const rows=[];
for(const forearmVolume of [false,true]){
 const legacy=buildObservedScene({forearmVolume,paperPartition:true,paperLapContact:true}).body;
 const candidate=buildObservedScene({forearmVolume,paperPartition:true,paperLapContact:true,seatSupport:true}).body;
 assert.deepEqual(candidate.positions,legacy.positions);assert.deepEqual(candidate.uv,legacy.uv);
 const input={yaw:.059,roll:.034},a=poseConnectedProxy(legacy,input),b=poseConnectedProxy(candidate,input);let seatVertices=0,oldMaxMotion=0,newMaxMotion=0,freeTorso=0;
 for(let i=0;i<candidate.vertices;i++){
  const x=candidate.uv[i*2]*1152,y=candidate.uv[i*2+1]*1536;
  if(y>=1410){seatVertices++;assert.equal(candidate.supportWeights[i],1);
   const movement=p=>Math.hypot(...[0,1,2].map(k=>p.positions[i*3+k]-candidate.positions[i*3+k]));oldMaxMotion=Math.max(oldMaxMotion,movement(a));newMaxMotion=Math.max(newMaxMotion,movement(b));}
  if(x>700&&x<850&&y>650&&y<850){assert(candidate.supportWeights[i]<1);freeTorso++;}
 }
 assert(seatVertices>100&&freeTorso>10);assert(oldMaxMotion>1,'negative control: old observed surface moved the seat');assert.equal(newMaxMotion,0);assert.equal(b.maxPinnedError,0);
 rows.push({forearmVolume,seatVertices,oldMaxMotion,newMaxMotion,freeTorso});
}
const report={rows,candidateOnly:true,sourceRgbUnchanged:true,wholeT03Accepted:false,phoneTested:false};fs.writeFileSync(new URL('../validation/observed-seat-support.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

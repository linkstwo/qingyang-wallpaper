import assert from 'node:assert/strict';
import fs from 'node:fs';
import {paperSourcePartition as chart} from '../character-prototype/preview/paper-source-partition.mjs';
import {subject} from '../character-prototype/preview/subject.mjs';
import {buildObservedScene} from '../character-prototype/preview/observed-scene.mjs';
import {projectWorld} from '../character-prototype/preview/scene-model.mjs';
import {poseConnectedProxy} from '../character-prototype/preview/structural-pose.mjs';
const inside=(x,y,poly)=>{let v=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])v=!v;}return v;};
const source=fs.readFileSync(new URL('../'+chart.source,import.meta.url));
const {createHash}=await import('node:crypto');assert.equal(createHash('sha256').update(source).digest('hex'),chart.sourceSha256);
// These are independently selected source pixels on the white paper rim which
// the old polygon assigned to the body. The old polygon is a failing control.
const recovered=[[100,798],[134,823],[179,858],[224,891],[2,880],[4,910],[12,840],[30,800],[410,1045]];
for(const p of recovered){assert(inside(...p,chart.outline),`new partition contains observed paper ${p}`);assert(!inside(...p,subject.paper),`old partition reproduces missed paper ${p}`);}
const area=s=>{let a=0;for(let i=0;i<s.uv.length;i+=6){const p=s.uv.slice(i,i+6);a+=Math.abs((p[2]-p[0])*(p[5]-p[1])-(p[3]-p[1])*(p[4]-p[0]))*1152*1536/2;}return a;};
const rows=[];for(const forearmVolume of [false,true]){
 const scene=buildObservedScene({forearmVolume,paperPartition:true}),totalArea=area(scene.body)+area(scene.paper),posed=poseConnectedProxy(scene.paper,{yaw:.06,pitch:-.04,roll:.035});
 assert(Math.abs(totalArea-1152*1536)<.05,'source partition preserves total source coverage');
 let projectionError=0,paperMotion=0;for(const s of [scene.body,scene.paper])for(let i=0;i<s.vertices;i++){const q=projectWorld(s.positions.slice(i*3,i*3+3));projectionError=Math.max(projectionError,Math.hypot(q[0]-s.uv[i*2]*1152,q[1]-s.uv[i*2+1]*1536));}
 for(let i=0;i<posed.positions.length;i++)paperMotion=Math.max(paperMotion,Math.abs(posed.positions[i]-scene.paper.positions[i]));
 assert(projectionError<1e-8);assert.equal(paperMotion,0,'paper remains world-supported independently of body pose');
 rows.push({forearmVolume,bodyVertices:scene.body.vertices,paperVertices:scene.paper.vertices,sourceAreaError:totalArea-1152*1536,maxNeutralProjectionError:projectionError,paperMotion});
}
const report={recoveredPaperPixels:recovered,oldOutlineFailsSelectedPixels:true,rows,productionUsed:false,phoneTested:false,continuousShoulderBackAccepted:false};
fs.writeFileSync(new URL('../validation/s2-paper-source-partition.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

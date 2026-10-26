import assert from 'node:assert/strict';
import fs from 'node:fs';
import {paperLapContactChain,paperLapContactWeight,paperExteriorCollars,paperSourcePartition} from '../character-prototype/preview/paper-source-partition.mjs';
import {buildObservedScene} from '../character-prototype/preview/observed-scene.mjs';
import {supportDepth,projectWorld} from '../character-prototype/preview/scene-model.mjs';
import {poseConnectedProxy} from '../character-prototype/preview/structural-pose.mjs';
for(const p of paperLapContactChain)assert.equal(paperLapContactWeight(...p),1);
for(const p of [[100,806],[500,800],[800,900],[350,990]])assert.equal(paperLapContactWeight(...p),0,'upper paper/fingers/torso must not be welded to lap');
const collars=paperExteriorCollars();assert.equal(collars.length,9);assert(!collars.some(p=>p[0]===paperSourcePartition.outline[8]),'lower lap edge is not discarded background');
const s=buildObservedScene({paperPartition:true,paperLapContact:true,paperExteriorTrim:true});
let projectionError=0,contactDepthError=0,pinnedMotion=0,contactVertices=0;
const posed=poseConnectedProxy(s.body,{yaw:.059,roll:.034});
for(let i=0;i<s.body.vertices;i++){
 const p=s.body.positions.slice(i*3,i*3+3),x=s.body.uv[i*2]*1152,y=s.body.uv[i*2+1]*1536,q=projectWorld(p);
 projectionError=Math.max(projectionError,Math.hypot(q[0]-x,q[1]-y));
 if(paperLapContactWeight(x,y)>1-1e-10){contactVertices++;contactDepthError=Math.max(contactDepthError,Math.abs(p[2]-supportDepth(x,y)));for(let k=0;k<3;k++)pinnedMotion=Math.max(pinnedMotion,Math.abs(p[k]-posed.positions[i*3+k]));}
}
assert(contactVertices>20);assert(projectionError<1e-8);assert(contactDepthError<1e-5);assert(pinnedMotion<1e-5);
const report={contactVertices,projectionError,contactDepthError,pinnedMotion,upperOcclusionNotWelded:true,exteriorCollars:collars.length,depthInferred:true,productionUsed:false,phoneTested:false,wholeT03Accepted:false};
fs.writeFileSync(new URL('../validation/paper-contact-regression.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

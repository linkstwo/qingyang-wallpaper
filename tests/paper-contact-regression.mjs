import assert from 'node:assert/strict';
import fs from 'node:fs';
import {paperLapContactChain,paperLapContactWeight,paperExteriorCollars,paperSourcePartition} from '../character-prototype/preview/paper-source-partition.mjs';
import {buildObservedScene} from '../character-prototype/preview/observed-scene.mjs';
import {supportDepth,projectWorld} from '../character-prototype/preview/scene-model.mjs';
import {poseConnectedProxy} from '../character-prototype/preview/structural-pose.mjs';
for(const p of paperLapContactChain)assert.equal(paperLapContactWeight(...p),1);
for(const p of [[100,806],[500,800],[800,900],[350,990]])assert.equal(paperLapContactWeight(...p),0,'upper paper/fingers/torso must not be welded to lap');
const collars=paperExteriorCollars();assert.equal(collars.length,9);assert(!collars.some(p=>p[0]===paperSourcePartition.outline[8]),'lower lap edge is not discarded background');
const rows=[];for(const forearmVolume of [false,true]){
const s=buildObservedScene({forearmVolume,paperPartition:true,paperLapContact:true,paperExteriorTrim:process.env.PAPER_CONTACT_NOTCH!=='1'});
let projectionError=0,contactDepthError=0,pinnedMotion=0,contactVertices=0;
const posed=poseConnectedProxy(s.body,{yaw:.059,roll:.034});
for(let i=0;i<s.body.vertices;i++){
 const p=s.body.positions.slice(i*3,i*3+3),x=s.body.uv[i*2]*1152,y=s.body.uv[i*2+1]*1536,q=projectWorld(p);
 projectionError=Math.max(projectionError,Math.hypot(q[0]-x,q[1]-y));
 if(paperLapContactWeight(x,y)>1-1e-10){contactVertices++;contactDepthError=Math.max(contactDepthError,Math.abs(p[2]-supportDepth(x,y)));for(let k=0;k<3;k++)pinnedMotion=Math.max(pinnedMotion,Math.abs(p[k]-posed.positions[i*3+k]));}
}
assert(contactVertices>20);assert(projectionError<1e-8);assert(contactDepthError<1e-5);assert(pinnedMotion<1e-5);
const lostSourceArea=s.conformity.paperContact.degenerateSourceArea;assert(lostSourceArea<.05,'discarded Float32 fragments stay below source area tolerance');
const paperBySource=new Map();for(let i=0;i<s.paper.vertices;i++){const key=s.paper.uv.slice(i*2,i*2+2).join(',');paperBySource.set(key,s.paper.positions.slice(i*3,i*3+3));}
let sharedContacts=0,maxSharedGap=0;
for(let i=0;i<s.body.vertices;i++){const uv=s.body.uv.slice(i*2,i*2+2),paper=paperBySource.get(uv.join(','));if(paper&&paperLapContactWeight(uv[0]*1152,uv[1]*1536)>1-1e-10){sharedContacts++;for(let k=0;k<3;k++)maxSharedGap=Math.max(maxSharedGap,Math.abs(paper[k]-s.body.positions[i*3+k]));}}
assert(sharedContacts>20);assert(maxSharedGap<1e-5);
rows.push({notched:process.env.PAPER_CONTACT_NOTCH==='1',forearmVolume,lostSourceArea,sharedContacts,maxSharedGap,contactVertices,projectionError,contactDepthError,pinnedMotion,upperOcclusionNotWelded:true,exteriorCollars:collars.length,depthInferred:true,productionUsed:false,phoneTested:false,wholeT03Accepted:false});}
const report={rows,productionUsed:false,wholeT03Accepted:false};
fs.writeFileSync(new URL('../validation/'+(process.env.PAPER_CONTACT_NOTCH==='1'?'paper-notch-contact-regression.json':'paper-contact-regression.json'),import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

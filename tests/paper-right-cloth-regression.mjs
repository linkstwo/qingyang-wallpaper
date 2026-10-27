import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildObservedScene} from '../character-prototype/preview/observed-scene.mjs';
import {paperRightClothContactChain,paperLapContactWeight} from '../character-prototype/preview/paper-source-partition.mjs';
import {traceVisibleObservedSource,sampleObservedAlpha} from '../character-prototype/preview/observed-source-ray.mjs';
import {poseConnectedProxy} from '../character-prototype/preview/structural-pose.mjs';
const pixels=fs.readFileSync(process.env.PAPER_MATTE_BYTES),matte={pixels,width:1152,height:1536};
const probes=[[239.5,795.5],[235.5,807.5],[227.5,820.5]],rows=[];
for(const p of paperRightClothContactChain)assert.equal(paperLapContactWeight(...p,96,{includeRightCloth:true}),1);
assert(paperLapContactWeight(480,1137,96)<1,'negative: old chain omits visible right cloth');
for(const p of [[299,945],[335,1005],[432,1030]])assert.equal(paperLapContactWeight(...p,96,{includeRightCloth:true}),0,'upper hand/background occlusion must remain free');
for(const forearmVolume of [false,true]){
 const make=on=>buildObservedScene({forearmVolume,paperPartition:true,paperLapContact:true,paperRightClothContact:on,lapContactWidth:96,seatSupport:true});
 const old=make(false),candidate=make(true);
 assert.deepEqual(candidate.body.uv,old.body.uv,'no new or guessed texture');
 const view={yaw:-Math.PI/9,alphaAt:(x,y)=>sampleObservedAlpha(matte,x,y)};
 for(const pixel of probes){
  const before=traceVisibleObservedSource(old,pixel,view),after=traceVisibleObservedSource(candidate,pixel,view);
  assert.equal(before.length,0,'old source must reproduce the gap');
  assert(after.length&&after[0].paper===false&&after[0].sourceAlpha>.99,'candidate supplies existing observed cloth');
  rows.push({forearmVolume,pixel,before:before.length,after});
 }
 const posed=poseConnectedProxy(candidate.body,{yaw:.059,pitch:-.04,roll:.034});let pinned=0;
 for(let i=0;i<candidate.body.vertices;i++){
  const x=candidate.body.uv[i*2]*1152,y=candidate.body.uv[i*2+1]*1536;
  if(paperLapContactWeight(x,y,96,{includeRightCloth:true})>1-1e-10){pinned++;for(let k=0;k<3;k++)assert(Math.abs(posed.positions[i*3+k]-candidate.body.positions[i*3+k])<1e-8);}
 }
 assert(pinned>150);
}
fs.writeFileSync(new URL('../validation/f13-right-cloth-rays.json',import.meta.url),JSON.stringify({rows,viewport:[540,1176],cameraYaw:-Math.PI/9,bodyPose:{},rear:false,geometryDepthInferred:true,sourceUvUnchanged:true,wholeT03Accepted:false,phoneTested:false},null,2)+'\n');
console.log('Right-cloth contact: both modes, legacy gap negative controls, observed source rays and support passed');

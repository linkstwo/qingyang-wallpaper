import assert from 'node:assert/strict';
import {traceObservedSource,traceVisibleObservedSource,sampleObservedAlpha} from '../character-prototype/preview/observed-source-ray.mjs';
import {unprojectSource} from '../character-prototype/preview/scene-model.mjs';
function surface(z,paper){const xy=[[300,400],[800,400],[550,1000]];return {vertices:3,paper,positions:xy.flatMap(p=>unprojectSource(...p,z)),uv:xy.flatMap(p=>[p[0]/1152,p[1]/1536])};}
const scene={body:surface(100,false),paper:surface(180,true)};
const pixel=[(.14+550/1600)*540,(.04+650/1740)*1176];
const hits=traceObservedSource(scene,pixel);assert.equal(hits.length,2);assert(hits[0].paper,'nearer supported paper wins geometric depth');
for(const hit of hits)assert(Math.hypot(hit.source[0]-550,hit.source[1]-650)<1e-9,'neutral source recovery');
assert.equal(traceObservedSource(scene,[0,0]).length,0);
for(const yaw of [-.35,.35]){
 const p=unprojectSource(550,650,180),x=Math.cos(yaw)*p[0]+Math.sin(yaw)*p[2],z=-Math.sin(yaw)*p[0]+Math.cos(yaw)*p[2],w=(2300-z)/2300;
 const pixel=[(.14+(x/w+790)/1600)*540,(.04+(p[1]/w+1110)/1740)*1176],hit=traceObservedSource(scene,pixel,{yaw}).find(h=>h.paper);
 assert(hit);assert(Math.hypot(hit.source[0]-550,hit.source[1]-650)<1e-9,'rotated source recovery including homogeneous UV');
}
// A moved body must be queried at that pose, while source interpolation retains rest W.
const posedScene={body:{...surface(100,false),skinWeights:Array(3).fill([0,1,0,0,0,0]).flat(),supportWeights:[0,0,0]},paper:{...surface(180,true),skinWeights:Array(18).fill(0),supportWeights:[1,1,1]}};
const {poseConnectedProxy}=await import('../character-prototype/preview/structural-pose.mjs');
const bodyPose={yaw:.059,pitch:-.04,roll:.034},posed=poseConnectedProxy(posedScene.body,bodyPose).positions;
const center=[0,1,2].map(k=>(posed[k]+posed[3+k]+posed[6+k])/3),yaw=-.04,pitch=.02;
const x=Math.cos(yaw)*center[0]+Math.sin(yaw)*center[2],z=-Math.sin(yaw)*center[0]+Math.cos(yaw)*center[2],y=Math.cos(pitch)*center[1]-Math.sin(pitch)*z,zz=Math.sin(pitch)*center[1]+Math.cos(pitch)*z,w=(2300-zz)/2300;
const screen=[(.14+(x/w+790)/1600)*540,(.04+(y/w+1110)/1740)*1176];
const moved=traceObservedSource(posedScene,screen,{yaw,pitch,bodyPose}).find(h=>!h.paper);
assert(moved&&Math.hypot(moved.source[0]-550,moved.source[1]-600)<1e-8);
const stale=traceObservedSource(posedScene,screen,{yaw,pitch}).find(h=>!h.paper);assert(!stale||Math.hypot(stale.source[0]-550,stale.source[1]-600)>1,'negative control: unposed ray must not masquerade as posed source');
assert(!traceVisibleObservedSource(posedScene,screen,{yaw,pitch,bodyPose,alphaAt:()=>0}).some(h=>!h.paper));
assert(traceVisibleObservedSource(posedScene,screen,{yaw,pitch,bodyPose,alphaAt:()=>.005}).some(h=>!h.paper),'shader keeps alpha exactly .005');
assert(!traceVisibleObservedSource(posedScene,screen,{yaw,pitch,bodyPose,alphaAt:()=>.0049}).some(h=>!h.paper));
assert.throws(()=>traceObservedSource(scene,pixel,{width:0}));assert.throws(()=>traceObservedSource(scene,[NaN,0]));assert.throws(()=>traceVisibleObservedSource(scene,pixel,{alphaAt:()=>NaN}));
console.log('Observed source rays: neutral, rotated, occlusion ordering and miss controls passed');

const matte={pixels:new Uint8Array([0,255,255,0]),width:2,height:2};assert.equal(sampleObservedAlpha(matte,1,1),.5);assert.equal(sampleObservedAlpha(matte,-5,-5),0);assert.equal(sampleObservedAlpha(matte,10,-5),1);assert.throws(()=>sampleObservedAlpha({...matte,width:0},0,0));

// Mixed rest depths protect the homogeneous UV correction from a naive barycentric rewrite.
const xyz=[[300,400],[800,400],[550,1000]],zs=[100,150,80];
const mixed={...posedScene.body,positions:xyz.flatMap((p,i)=>unprojectSource(...p,zs[i]))};
const restW=zs.map(z=>(2300-z)/2300),expected=[0,1].map(k=>xyz.reduce((n,p,i)=>n+p[k]*restW[i],0)/restW.reduce((a,b)=>a+b,0));
let mixedDepthCases=0;
for(const yaw of [-.35,.35])for(const roll of [-.034,.034]){
 const bodyPose={yaw:.059,pitch:-.04,roll},q=poseConnectedProxy(mixed,bodyPose).positions,p=[0,1,2].map(k=>(q[k]+q[k+3]+q[k+6])/3);
 const x=Math.cos(yaw)*p[0]+Math.sin(yaw)*p[2],z=-Math.sin(yaw)*p[0]+Math.cos(yaw)*p[2],pitch=.02,y=Math.cos(pitch)*p[1]-Math.sin(pitch)*z,zz=Math.sin(pitch)*p[1]+Math.cos(pitch)*z,w=(2300-zz)/2300;
 const pixel=[(.14+(x/w+790)/1600)*540,(.04+(y/w+1110)/1740)*1176],hit=traceObservedSource({body:mixed,paper:posedScene.paper},pixel,{yaw,pitch,bodyPose}).find(h=>!h.paper);
 assert(hit&&Math.hypot(...hit.source.map((v,k)=>v-expected[k]))<1e-8);mixedDepthCases++;
}
const fs=await import('node:fs');fs.writeFileSync(new URL('../validation/source-ray-posed.json',import.meta.url),JSON.stringify({mixedDepthCases,posedSourceRecovery:true,matteDiscardBoundaryTested:true,bilinearClampTested:true,negativeStalePoseControl:true,actualRasterVisibilityAccepted:false,phoneTested:false},null,2)+'\n');

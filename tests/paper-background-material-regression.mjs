import fs from 'node:fs';import assert from 'node:assert/strict';
import {buildObservedScene} from '../character-prototype/preview/observed-scene.mjs';
import {supportDepth,projectWorld} from '../character-prototype/preview/scene-model.mjs';
import {paperLeftBackgroundOutline} from '../character-prototype/preview/paper-source-partition.mjs';
import {traceVisibleObservedSource,sampleObservedAlpha} from '../character-prototype/preview/observed-source-ray.mjs';
const matte={pixels:fs.readFileSync(process.env.PAPER_MATTE_BYTES),width:1152,height:1536};
const view={yaw:Math.PI/9,alphaAt:(x,y)=>sampleObservedAlpha(matte,x,y)};
const area=s=>{let n=0;for(let i=0;i<s.uv.length;i+=6){const p=s.uv.slice(i,i+6);n+=Math.abs((p[2]-p[0])*(p[5]-p[1])-(p[3]-p[1])*(p[4]-p[0]))*1152*1536/2;}return n;};
const polygonArea=Math.abs(paperLeftBackgroundOutline.reduce((n,a,i)=>{const b=paperLeftBackgroundOutline[(i+1)%paperLeftBackgroundOutline.length];return n+a[0]*b[1]-b[0]*a[1];},0)/2);
const rows=[];
for(const forearmVolume of [false,true]){
 const opts={forearmVolume,paperPartition:true,paperLapContact:true,paperRightClothContact:true,lapContactWidth:96,seatSupport:true};
 const old=buildObservedScene(opts),candidate=buildObservedScene({...opts,paperBackgroundTrim:true});
 const removedArea=area(old.body)-area(candidate.body);assert(Math.abs(removedArea-polygonArea)<.05,'only the declared background source region is removed');
 assert(Math.abs(area(candidate.paper)-area(old.paper))<.05,'paper source coverage remains unchanged after shared boundary retriangulation');
 for(let i=0;i<candidate.paper.vertices;i++){const uv=candidate.paper.uv.slice(i*2,i*2+2).map((v,k)=>v*[1152,1536][k]),p=candidate.paper.positions.slice(i*3,i*3+3),q=projectWorld(p);assert(Math.abs(p[2]-supportDepth(...uv))<1e-8);assert(Math.hypot(q[0]-uv[0],q[1]-uv[1])<1e-8);assert.equal(candidate.paper.supportWeights[i],1);}
 for(const pixel of [[70.5,780.5],[70.5,800.5],[80.5,820.5]]){
  const before=traceVisibleObservedSource(old,pixel,view),after=traceVisibleObservedSource(candidate,pixel,view);
  assert(before.length&&!before[0].paper,'old foreground misclassifies workshop background');assert.equal(after.length,0,'background must not remain a detached foreground shard');
  rows.push({forearmVolume,pixel,misclassifiedSource:before[0].source,afterHits:after.length,removedSourceArea:removedArea});
 }
 for(const pixel of [[150,750],[350,700]])assert(traceVisibleObservedSource(candidate,pixel,view).length,'paper/body positive controls must still render');
}
fs.writeFileSync(new URL('../validation/f13-background-material.json',import.meta.url),JSON.stringify({rows,declaredBackgroundArea:polygonArea,materialClassification:'manual source observation; approximate boundary',newHiddenTexture:false,wholeT03Accepted:false,phoneTested:false},null,2)+'\n');console.log(JSON.stringify({rows:rows.length,declaredBackgroundArea:polygonArea,passed:true}));

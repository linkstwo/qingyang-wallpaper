import assert from 'node:assert/strict';import fs from 'node:fs';
import {nearArmDepthRegion,nearArmBlendWeight,nearArmDepthAt} from '../character-prototype/preview/near-arm-surface.mjs';
import {depthAt} from '../character-prototype/preview/structure.mjs';
import {buildObservedScene} from '../character-prototype/preview/observed-scene.mjs';
import {projectWorld} from '../character-prototype/preview/scene-model.mjs';
for(const p of nearArmDepthRegion.outline){assert(nearArmBlendWeight(...p)<1e-12,'attachment boundary has zero depth offset');assert(Math.abs(nearArmDepthAt(...p)-depthAt(...p))<1e-8);}
for(const p of [[800,700],[350,1005],[500,1150],[700,1500]])assert.equal(nearArmDepthAt(...p),depthAt(...p),'face/torso/far hand/paper/lap must be unaffected');
const changes=[],rows=[];for(const forearmVolume of [false,true]){
 const before=buildObservedScene({forearmVolume}),after=buildObservedScene({forearmVolume,nearArmVolume:true});assert.deepEqual(before.body.uv,after.body.uv);assert.deepEqual(before.paper,after.paper);assert.deepEqual(before.body.supportWeights,after.body.supportWeights);
 let maxNeutral=0,modified=0,maxDepthDelta=0;for(let i=0;i<after.body.vertices;i++){const uv=after.body.uv.slice(i*2,i*2+2).map((v,k)=>v*[1152,1536][k]),p=after.body.positions.slice(i*3,i*3+3),q=projectWorld(p);maxNeutral=Math.max(maxNeutral,Math.hypot(q[0]-uv[0],q[1]-uv[1]));const delta=p[2]-before.body.positions[i*3+2];maxDepthDelta=Math.max(maxDepthDelta,Math.abs(delta));if(Math.abs(delta)>1e-8){modified++;assert(nearArmBlendWeight(...uv)>0);}}
 assert(modified>100&&maxDepthDelta>10);assert(maxNeutral<1e-8);rows.push({forearmVolume,modified,maxDepthDelta,maxNeutral});
}
assert.throws(()=>nearArmDepthAt(NaN,0));assert.throws(()=>nearArmDepthAt(1000,600,()=>NaN));
fs.writeFileSync('validation/f14-near-arm-depth.json',JSON.stringify({rows,depthInferred:true,sourceUvExact:true,sourceRgbChanged:false,hiddenTextureAdded:false,defaultEnabled:false,wholeT04Accepted:false,phoneTested:false},null,2)+'\n');console.log(JSON.stringify({rows,passed:true}));

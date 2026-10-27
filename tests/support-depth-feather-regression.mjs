import fs from 'node:fs';import assert from 'node:assert/strict';
import {buildObservedScene} from '../character-prototype/preview/observed-scene.mjs';
import {depthAt} from '../character-prototype/preview/structure.mjs';
import {bodySupportDepthWeight} from '../character-prototype/preview/contact-rig.mjs';
const implicit=buildObservedScene(),old=buildObservedScene({supportDepthFeather:120}),candidate=buildObservedScene({supportDepthFeather:160});assert.deepEqual(implicit,old,'legacy default exactly retained');
assert.deepEqual(old.body.uv,candidate.body.uv);assert.deepEqual(old.paper,candidate.paper);assert.deepEqual(old.body.supportWeights,candidate.body.supportWeights);let changed=0,maxDelta=0;
for(let i=0;i<candidate.body.vertices;i++){const d=Math.abs(candidate.body.positions[i*3+2]-old.body.positions[i*3+2]);if(d>1e-8)changed++;maxDelta=Math.max(maxDelta,d);assert(Number.isFinite(d));}
assert(changed>100);assert.equal(depthAt(350,1005,120),depthAt(350,1005,160),'held wrist remains supported');
assert.throws(()=>bodySupportDepthWeight(0,0,NaN));assert.throws(()=>buildObservedScene({supportDepthFeather:999}));
fs.writeFileSync('validation/f14-support-feather.json',JSON.stringify({changedVertices:changed,maxDepthDelta:maxDelta,default120Exact:true,sourceUvExact:true,paperExact:true,motionSupportWeightsExact:true,depthInferred:true,wholeT03Accepted:false,phoneTested:false},null,2)+'\n');console.log(JSON.stringify({changedVertices:changed,maxDepthDelta:maxDelta,default120Exact:true}));

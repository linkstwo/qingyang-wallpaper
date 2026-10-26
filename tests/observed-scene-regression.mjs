import assert from 'node:assert/strict';import fs from 'node:fs';
import {buildObservedScene} from '../character-prototype/preview/observed-scene.mjs';import {projectWorld} from '../character-prototype/preview/scene-model.mjs';
const scene=buildObservedScene();let maxError=0,paperPins=0;
for(const s of [scene.body,scene.paper])for(let i=0;i<s.vertices;i++){
 const p=s.positions.slice(i*3,i*3+3),uv=s.uv.slice(i*2,i*2+2),q=projectWorld(p);maxError=Math.max(maxError,Math.hypot(q[0]-uv[0]*1152,q[1]-uv[1]*1536));
 assert(Number.isFinite(q[2])&&q[2]>0);assert(s.supportWeights[i]>=0&&s.supportWeights[i]<=1);
 if(s.paper){assert(s.supportWeights[i]===1);paperPins++;}else assert(Math.abs(s.skinWeights.slice(i*6,i*6+6).reduce((a,b)=>a+b)-1)<1e-12);
}
assert(maxError<1e-9);const r={bodyVertices:scene.body.vertices,paperVertices:scene.paper.vertices,maxNeutralProjectionErrorSourcePixels:maxError,paperWorldPins:paperPins,frontAndRearWelded:false,productionUsed:false,phoneTested:false};fs.writeFileSync(new URL('../validation/s2-observed-scene.json',import.meta.url),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));

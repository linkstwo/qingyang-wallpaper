import assert from 'node:assert/strict';
import {traceObservedSource} from '../character-prototype/preview/observed-source-ray.mjs';
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
console.log('Observed source rays: neutral, rotated, occlusion ordering and miss controls passed');

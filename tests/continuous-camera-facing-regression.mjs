import assert from 'node:assert/strict';
import {cameraVectorExtrema,cameraTriangleFacing} from '../character-prototype/preview/continuous-camera-facing.mjs';
const domain={yaw:[-.35,.35],pitch:[-.02,.02]},rotate=(p,a,b)=>{const x=Math.cos(a)*p[0]+Math.sin(a)*p[2],z=-Math.sin(a)*p[0]+Math.cos(a)*p[2];return [x,Math.cos(b)*p[1]-Math.sin(b)*z,Math.sin(b)*p[1]+Math.cos(b)*z];};
let seed=19;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
for(let n=0;n<40;n++){const p=[0,1,2].map(()=>rand()*300-150),e=cameraVectorExtrema(p,domain);for(let i=0;i<=40;i++)for(let j=0;j<=10;j++){const q=rotate(p,-.35+i*.7/40,-.02+j*.04/10)[2];assert(q>=e.min-1e-10&&q<=e.max+1e-10);}assert(Math.abs(rotate(p,...e.minAt)[2]-e.min)<1e-10);assert(Math.abs(rotate(p,...e.maxAt)[2]-e.max)<1e-10);}
const points=[[0,0,100],[100,0,110],[0,100,120]],area=p=>(p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0]);
const f=cameraTriangleFacing(points,{...domain,sourceArea2:10000});assert(f.orientationPreserved);
for(let i=0;i<=40;i++){const p=points.map(p=>rotate(p,-.35+i*.7/40,.02)).map(p=>[p[0]/(1-p[2]/2300),p[1]/(1-p[2]/2300)]);assert(area(p)/10000>=f.areaRatioLowerBound-1e-12);}
// Endpoints of pitch can both be positive while the interior contains the
// actual minimum/maximum; the stationary candidates must be included.
const interior=cameraVectorExtrema([0,0,1],domain);assert.equal(interior.max,1);assert.deepEqual(interior.maxAt,[0,0]);
const negative=cameraTriangleFacing([[0,0,0],[.1,0,100],[0,100,0]],{...domain,sourceArea2:10});assert(!negative.orientationPreserved&&negative.minimumFacing<0,'negative: a nearly edge-on plane flips within the yaw interval');
assert.throws(()=>cameraVectorExtrema([0,0,1],{yaw:[0,1],pitch:[-2,2]}));assert.throws(()=>cameraTriangleFacing(points,{...domain,sourceArea2:0}));console.log('Continuous camera extrema: stationary/boundary candidates, dense independent controls, perspective area bound and folding negative passed');

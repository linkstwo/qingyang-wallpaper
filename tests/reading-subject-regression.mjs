import assert from 'node:assert/strict';
import fs from 'node:fs';
import {subject} from '../character-prototype/preview/subject.mjs';
import {depthAt,deformPoint,solveArm,hairWeight} from '../character-prototype/preview/structure.mjs';
import {projectSource,supportDepth} from '../character-prototype/preview/scene-model.mjs';
import {bodyContactPin as contactPin} from '../character-prototype/preview/contact-rig.mjs';
import {cropPreset,cropMapping} from '../character-prototype/preview/crop-frame.mjs';
const assets=new URL('../android-app/app/src/main/assets/',import.meta.url),bytes=fs.readFileSync(new URL('character_mesh.bin',assets));
const mesh=Float32Array.from({length:bytes.length/4},(_,i)=>bytes.readFloatLE(i*4));
const area=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const unique=new Map();for(let i=0;i<mesh.length;i+=2){const x=mesh[i],y=mesh[i+1],key=x+','+y;if(!unique.has(key))unique.set(key,{p:[x,y],z:Math.fround(depthAt(x,y)),pin:Math.fround(contactPin(x,y))});}
const points=[...unique.values()],indices=new Map(points.map((p,i)=>[p.p.join(','),i])),ids=Array.from({length:mesh.length/2},(_,i)=>indices.get(mesh[i*2]+','+mesh[i*2+1]));
let cases=0,triangles=0,minRatio=Infinity,maxContactError=0;
for(const vx of [-1,0,1])for(const vy of [-1,0,1])for(const sign of [-1,0,1])for(const spatial of [false,true]){
 const view=[vx,vy],body=[sign*6,-sign*6],chest=[sign*11.9,-sign*11.9,sign*10.2],hair=[sign*21,sign*10.5];
 const q=points.map(({p,z,pin})=>deformPoint(...p,z,view,body,chest,hair,1.45,pin,spatial));
 for(let i=0;i<ids.length;i+=3){const a=ids[i],b=ids[i+1],c=ids[i+2],ratio=area(q[a],q[b],q[c])/area(points[a].p,points[b].p,points[c].p);assert(Number.isFinite(ratio)&&ratio>0,'folded/nonfinite reading-v2 triangle');minRatio=Math.min(minRatio,ratio);triangles++;}
 for(const p of [[330,990],[500,1450]]){const d=deformPoint(...p,depthAt(...p),view,body,chest,hair,1.45,contactPin(...p),spatial);maxContactError=Math.max(maxContactError,Math.hypot(d[0]-(spatial?projectSource(...p,supportDepth(...p),view)[0]:p[0]),d[1]-(spatial?projectSource(...p,supportDepth(...p),view)[1]:p[1])));}cases++;
}
assert(minRatio>.15,'production angle margin under combined extremes');
assert(maxContactError<1e-9,'fixed hand/paper/seat');for(const p of [[590,535],[600,525],[565,550]])assert(solveArm(p).reachable);
assert.equal(hairWeight(350,330),0);assert(hairWeight(480,590)>.99);assert(hairWeight(550,305)<1e-9);
for(const [w,h] of [[540,1176],[1080,2400],[1260,2800]]){const f=cropMapping(w,h,cropPreset(w,h));assert(Math.abs(f.y+subject.focus[1]*f.scale-h/2)<.001);assert(1536*f.scale/h>.75);}
const result={subject:subject.id,cases,triangles,minSignedAreaRatio:minRatio,maxContactError,phoneTested:false};fs.writeFileSync(new URL('../validation/reading-subject-0.5.8.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));

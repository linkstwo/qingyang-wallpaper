// Independent T05 audit: source-matte samples distinguish definitely opaque
// failure candidates from geometric triangles wholly outside the photograph.
import fs from 'node:fs';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
import {buildObservedScene} from '../character-prototype/preview/observed-scene.mjs';
import {poseConnectedProxy} from '../character-prototype/preview/structural-pose.mjs';
import {projectWorld,sceneModel} from '../character-prototype/preview/scene-model.mjs';
const path=new URL('../character-prototype/preview/mask.png',import.meta.url);
const raw=execFileSync('python3',['-c','from PIL import Image;import sys;im=Image.open(sys.argv[1]).convert("L");assert im.size==(1152,1536);sys.stdout.buffer.write(im.tobytes())',path.pathname],{maxBuffer:4e6});
const area=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const sample=p=>raw[Math.max(0,Math.min(1535,Math.floor(p[1])))*1152+Math.max(0,Math.min(1151,Math.floor(p[0])))];
const inputs=[{}];for(const yaw of [-.06,.06])for(const pitch of [-.04,.04])for(const roll of [-.035,.035])inputs.push({yaw,pitch,roll});
const old=[sceneModel.yawRadians,sceneModel.pitchRadians],groups=[];
try{for(const volume of [false,true]){
 const s=buildObservedScene({forearmVolume:volume,paperPartition:true,paperLapContact:true}).body;
 const uv=Array.from({length:s.vertices},(_,i)=>s.uv.slice(i*2,i*2+2).map((v,k)=>v*(k?1536:1152)));
 const tris=[];for(let i=0;i<s.vertices;i+=3){const p=uv.slice(i,i+3),a=area(...p),centroid=[0,1].map(k=>(p[0][k]+p[1][k]+p[2][k])/3);
  const alpha=[...p,centroid,...[[0,1],[1,2],[2,0]].map(([a,b])=>[0,1].map(k=>(p[a][k]+p[b][k])/2))].map(sample);
  tris.push({i,sourceArea:Math.abs(a)/2,orientedArea:a,source:p,opaque:Math.min(...alpha)>=250,anyMask:Math.max(...alpha)>=2});
 }
 for(const range of [{name:'production-camera',yaw:.04,pitch:.02},{name:'diagnostic-camera',yaw:.14,pitch:.07}]){
 sceneModel.yawRadians=range.yaw;sceneModel.pitchRadians=range.pitch;
 let worst=null,opaqueWorst=null,flips=0,opaqueFlips=0,degenerateFlips=0,cases=0;
 for(const input of inputs){const posed=poseConnectedProxy(s,input);
 for(const view of [[0,0],[-1,-1],[-1,1],[1,-1],[1,1]]){
  const q=Array.from({length:s.vertices},(_,i)=>projectWorld(posed.positions.slice(i*3,i*3+3),view));
  for(const t of tris){const r=area(...q.slice(t.i,t.i+3))/t.orientedArea;cases++;
   if(r<=0){flips++;if(t.sourceArea<.01)degenerateFlips++;}
   if(!worst||r<worst.ratio)worst={ratio:r,sourceArea:t.sourceArea,source:t.source,input,view};
   if(t.opaque&&t.sourceArea>=.01){if(r<=0)opaqueFlips++;if(!opaqueWorst||r<opaqueWorst.ratio)opaqueWorst={ratio:r,sourceArea:t.sourceArea,source:t.source,input,view};}
  }
 }}
 groups.push({volume,range,triangleCases:cases,flips,degenerateFlips,opaqueFlips,worst,opaqueWorst});
 }}}finally{[sceneModel.yawRadians,sceneModel.pitchRadians]=old;}
const report={baseHead:'17b7e3451a667b82859366555d8d5d123e005c09',maskSha256:crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'),method:'7 nearest source-mask samples; opaque>=250/255 and area>=0.01px². These are source-opaque candidates, not final depth-visible pixels.',bodyPoseDiagnosticOnly:true,groups,accepted:false,phoneTested:false,sourceGeometryModified:false};
fs.writeFileSync(new URL('../validation/masked-projection-audit-20261027.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(groups.map(({volume,range,flips,opaqueFlips,degenerateFlips,opaqueWorst})=>({volume,range:range.name,flips,opaqueFlips,degenerateFlips,opaqueWorst}))));
// Expected to expose defects. Do not convert a failed audit into a pass.
if(groups.some(g=>g.opaqueFlips))process.exitCode=1;

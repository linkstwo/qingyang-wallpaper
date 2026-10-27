import assert from 'node:assert/strict';import fs from 'node:fs';
import {buildObservedScene} from '../character-prototype/preview/observed-scene.mjs';
import {poseConnectedProxy} from '../character-prototype/preview/structural-pose.mjs';
import {projectWorld,sceneModel} from '../character-prototype/preview/scene-model.mjs';
const scene=buildObservedScene({forearmVolume:true}),surface=scene.body,area=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const source=Array.from({length:surface.vertices},(_,i)=>surface.uv.slice(i*2,i*2+2)),poses=[{}];for(const yaw of [-.06,.06])for(const pitch of [-.04,.04])for(const roll of [-.035,.035])poses.push({yaw,pitch,roll});
const old=[sceneModel.yawRadians,sceneModel.pitchRadians];let minAreaRatio=Infinity,minForearmAreaRatio=Infinity,triangleCases=0,maxPinnedError=0,worst=null;
try{sceneModel.yawRadians=.14;sceneModel.pitchRadians=.07;
 for(const input of poses){const posed=poseConnectedProxy(surface,input);maxPinnedError=Math.max(maxPinnedError,posed.maxPinnedError);
  for(const view of [[0,0],[-1,-1],[-1,1],[1,-1],[1,1]]){
   const q=Array.from({length:surface.vertices},(_,i)=>projectWorld(posed.positions.slice(i*3,i*3+3),view));for(let i=0;i<surface.vertices;i+=3){const A=area(...source.slice(i,i+3))*1152*1536,B=area(...q.slice(i,i+3)),ratio=B/A;if(i>=scene.forearmFirstVertex)minForearmAreaRatio=Math.min(minForearmAreaRatio,ratio);if(ratio<minAreaRatio){minAreaRatio=ratio;worst={source:source.slice(i,i+3).map(p=>[p[0]*1152,p[1]*1536]),input,view};}triangleCases++;}
  }
 }
}finally{[sceneModel.yawRadians,sceneModel.pitchRadians]=old;}
const report={poses:poses.length,cameraViews:5,minAreaRatio,minForearmAreaRatio,fullFrontAccepted:minAreaRatio>.05,triangleCases,maxPinnedError,worst,depthInferred:true,productionUsed:false,phoneTested:false};fs.writeFileSync(new URL('../validation/s2-forearm-pose.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));assert(minForearmAreaRatio>.05,'new forearm must remain oriented; full-front acceptance is reported separately');assert.equal(maxPinnedError,0);

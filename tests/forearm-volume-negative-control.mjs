// A deliberately rejected single-sheet solution must continue to fail.
import assert from 'node:assert/strict';import fs from 'node:fs';
import {makeLayeredCharacterMesh} from '../character-prototype/preview/layered-mesh.mjs';
import {inferredFrontDepthAt} from '../character-prototype/preview/forearm-volume.mjs';
import {deformPoint} from '../character-prototype/preview/structure.mjs';
import {sceneModel} from '../character-prototype/preview/scene-model.mjs';
import {bodyContactPin} from '../character-prototype/preview/contact-rig.mjs';
const source=makeLayeredCharacterMesh(),area=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),old=[sceneModel.yawRadians,sceneModel.pitchRadians];let minAreaRatio=Infinity,worst=null;
try{sceneModel.yawRadians=.08;sceneModel.pitchRadians=.04;for(let i=0;i<source.length;i+=6){const p=[0,2,4].map(k=>Array.from(source.slice(i+k,i+k+2))),q=p.map(p=>deformPoint(...p,inferredFrontDepthAt(...p),[1,-1],[6,-6],[11.9,-11.9,10.2],[21,10.5],1.45,bodyContactPin(...p),true)),ratio=area(...q)/area(...p);if(ratio<minAreaRatio){minAreaRatio=ratio;worst=p;}}}finally{[sceneModel.yawRadians,sceneModel.pitchRadians]=old;}
assert(minAreaRatio<0,'must reproduce direct single-sheet forearm fold');const report={expectedFailureReproduced:true,minAreaRatio,worst,solutionRejected:true,productionUsed:false};fs.writeFileSync(new URL('../validation/s2-forearm-negative-control.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

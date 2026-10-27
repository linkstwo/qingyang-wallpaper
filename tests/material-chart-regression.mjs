import assert from 'node:assert/strict';import fs from 'node:fs';
import {buildConnectedProxy} from '../character-prototype/preview/connected-proxy.mjs';
import {buildBackChart,backChartAt,backChart,validateBackChart} from '../character-prototype/preview/material-chart.mjs';
import {unprojectSource} from '../character-prototype/preview/scene-model.mjs';
const model=buildConnectedProxy(),m=buildBackChart(model);let candidates=0,triangles=0;
for(let i=0;i<m.candidate.length;i++){
 assert(m.confidence[i]===0&&model.confidence[i]===0,'provisional mapping must not enable production texture');
 if(m.candidate[i]){candidates++;assert(model.region[i]===1);assert(m.uv.slice(i*2,i*2+2).every(v=>v>0&&v<1));}
}
for(let i=0;i<model.indices.length;i+=3)if(model.indices.slice(i,i+3).every(j=>m.candidate[j]))triangles++;
assert(candidates>1000&&triangles>1000);for(const p of [[0,-1000,0],[0,500,0]])assert(backChartAt(p,1).candidate===0);
assert(backChartAt([0,-200,-50],2).candidate===0&&backChartAt([0,-200,-50],3).candidate===0,'arm pixels must not sample torso source');
assert(backChartAt(unprojectSource(655,790,-40),1).uv[0]>backChartAt(unprojectSource(855,790,-40),1).uv[0],'rear camera must reverse main-world horizontal orientation');
assert(validateBackChart(backChart));for(const mutate of [c=>c.confidence=1,c=>c.source='other.png',c=>c.rows[2].left[1]=0,c=>c.rows[0].right[0]=0,c=>c.rows[1].left[0]=NaN]){const c=structuredClone(backChart);mutate(c);assert(!validateBackChart(c),'invalid, folded or falsely trusted chart must be rejected');}
const r={candidateVertices:candidates,candidateTriangles:triangles,productionTrustedVertices:0,otherRegionsExcluded:true,cameraCalibrated:false,phoneTested:false};fs.writeFileSync(new URL('../validation/s2-back-chart.json',import.meta.url),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));

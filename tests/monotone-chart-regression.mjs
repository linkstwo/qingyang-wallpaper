import assert from 'node:assert/strict';import fs from 'node:fs';import {monotoneCurve} from '../character-prototype/preview/monotone-curve.mjs';import {backChart,sampleBackRails,validateBackChart} from '../character-prototype/preview/material-chart.mjs';
let checks=0,maxDerivativeJump=0;
for(const [xs,ys] of [[[0,1],[2,4]],[[0,1,3,7],[0,2,3,10]],[[0,1,2,5],[0,3,1,1]],[[0,1,3],[2,2,2]]]){const f=monotoneCurve(xs,ys);for(let i=0;i<xs.length;i++){assert(Math.abs(f(xs[i])-ys[i])<1e-10);checks++;}for(let i=0;i<xs.length-1;i++)for(let k=0;k<=100;k++){const v=f(xs[i]+(xs[i+1]-xs[i])*k/100);assert(v>=Math.min(ys[i],ys[i+1])-1e-10&&v<=Math.max(ys[i],ys[i+1])+1e-10);checks++;}}
assert(validateBackChart(backChart));assert(!validateBackChart({...backChart,version:1}));
for(let i=0;i<backChart.rows.length;i++)for(let side=0;side<2;side++){
 const row=backChart.rows[i],key=['left','right'][side],q=sampleBackRails(row.y)[side];assert.deepEqual(q,row[key]);
 if(i&&i<backChart.rows.length-1){const delta=1e-3,L=sampleBackRails(row.y-delta)[side],R=sampleBackRails(row.y+delta)[side];for(let k=0;k<2;k++){const jump=Math.abs((q[k]-L[k])/delta-(R[k]-q[k])/delta);assert(jump<.0002);maxDerivativeJump=Math.max(maxDerivativeJump,jump);checks++;}}
}
let minRailWidth=Infinity;for(let i=0;i<=2000;i++){const y=415+(1100-415)*i/2000,[L,R]=sampleBackRails(y);assert(R[0]>L[0]);minRailWidth=Math.min(minRailWidth,R[0]-L[0]);checks++;}
const folded=structuredClone(backChart);folded.rows[1].left=[477,390];assert(!validateBackChart(folded));
const r={checks,maxSourceRailDerivativeJump:maxDerivativeJump,minSourceRailWidth:minRailWidth,neckToBackC1Rails:true,legacyDraftRejected:true,productionConfidence:0,phoneTested:false};fs.writeFileSync(new URL('../validation/s2-monotone-chart.json',import.meta.url),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));

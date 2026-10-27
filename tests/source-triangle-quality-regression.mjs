import assert from 'node:assert/strict';
import {sourceTriangleQuality as quality} from '../character-prototype/preview/source-triangle-quality.mjs';
const noisy=[[552.2883911132812,993.6434936523438],[551.6019287109375,993.772705078125],[552.631591796875,993.5789184570312]];
const q=quality(noisy);assert(q.degenerate&&q.altitude<q.float32HeightBudget,'negative: quantised contour sliver cannot define a robust curved triangle');
for(const tri of [[[0,0],[10,0],[0,10]],[[550,990],[560,990],[555,990.01]],[[1000,1000],[1000.01,1000],[1000,1000.01]]])assert(!quality(tri).degenerate,'healthy small source geometry retained');
assert(quality([[500,500],[501,501],[502,502]]).degenerate);assert.throws(()=>quality([[NaN,0],[1,0],[0,1]]));console.log(JSON.stringify({noisyContour:q,healthyControlsRetained:true}));

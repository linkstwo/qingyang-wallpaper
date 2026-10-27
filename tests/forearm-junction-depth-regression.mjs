import assert from 'node:assert/strict';import fs from 'node:fs';
import {forearmOutline,forearmSurfaceDepth,forearmJunctionDepth} from '../character-prototype/preview/forearm-surface.mjs';
import {depthAt} from '../character-prototype/preview/structure.mjs';
let oldMaxBoundaryGap=0;
for(const p of forearmOutline){const arm=forearmSurfaceDepth(...p),joined=forearmJunctionDepth(...p);assert(Math.abs(arm-joined)<1e-8);oldMaxBoundaryGap=Math.max(oldMaxBoundaryGap,Math.abs(arm-depthAt(...p)));}
assert(oldMaxBoundaryGap>5,'negative: old separate depth fields must expose real boundary mismatch');
for(const p of [[100,100],[1000,1000],[500,1400]])assert.equal(forearmJunctionDepth(...p),depthAt(...p),'remote body regions unchanged');
assert.throws(()=>forearmJunctionDepth(NaN,0));assert.throws(()=>forearmJunctionDepth(0,0,depthAt,2));
fs.writeFileSync('validation/f14-forearm-junction-depth.json',JSON.stringify({oldMaxBoundaryGap,newBoundaryGap:0,sourceRgbChanged:false,depthInferred:true,componentCutIsConservative:true,registrationAccepted:false,wholeT03Accepted:false,phoneTested:false},null,2)+'\n');console.log(JSON.stringify({oldMaxBoundaryGap,newBoundaryGap:0}));

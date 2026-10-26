import assert from 'node:assert/strict';import {fitComponentCrop} from '../character-prototype/preview/component-raster.mjs';
let rows=0;for(const roi of [[640,295,330,360],[790,380,240,660],[0,0,1086,1448]])for(const [w,h] of [[540,590],[540,588],[300,900],[900,300]]){
 const c=fitComponentCrop(roi,w,h);assert(Math.abs(w/c[2]-h/c[3])<1e-12,'source pixels must have isotropic scale');assert(c[0]<=roi[0]+1e-8&&c[1]<=roi[1]+1e-8&&c[0]+c[2]>=roi[0]+roi[2]-1e-8&&c[1]+c[3]>=roi[1]+roi[3]-1e-8,'full source region retained');assert(Math.abs(c[0]+c[2]/2-roi[0]-roi[2]/2)<1e-8);assert(Math.abs(c[1]+c[3]/2-roi[1]-roi[3]/2)<1e-8);rows++;
}
const oldStretch=(540/240)/(590/660);assert(oldStretch>2.5,'negative control must reproduce old donor preview stretching');assert.throws(()=>fitComponentCrop([0,0,0,2],540,590));assert.throws(()=>fitComponentCrop([0,0,2,2],NaN,590));console.log(JSON.stringify({rows,oldHorizontalStretch:oldStretch,newScaleIsotropic:true}));

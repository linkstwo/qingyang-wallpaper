import assert from 'node:assert/strict';
import {componentTriangleOverlaps as check} from '../character-prototype/preview/component-collision.mjs';
const tri=[[0,0],[10,0],[0,10]],flatten=p=>p.flat(),ids=[0,1,2,3,4,5];
for(const other of [tri,[[1,1],[2,1],[1,2]],[[4,-2],[12,5],[4,12]],[[10,0],[0,0],[0,10]]])assert(check(flatten([...tri,...other]),ids).overlaps.length,'overlap/containment/duplicate/winding must be rejected');
for(const other of [[[10,0],[10,10],[0,10]],[[10,0],[20,0],[10,10]],[[20,20],[30,20],[20,30]]])assert.equal(check(flatten([...tri,...other]),ids).overlaps.length,0,'shared edge/point and disjoint material are legal');
assert.equal(check([0,0,10,0,0,10,10,10],[0,1,2,1,3,2]).overlaps.length,0,'shared indexed edge legal');
assert.throws(()=>check([NaN,0],[0,0,0]));assert.throws(()=>check([0,0],[0,1,2]));assert.throws(()=>check(flatten(tri),[0,1,2],{epsilon:-1}));
const capped=check(flatten([...tri,...tri,...tri]),[0,1,2,3,4,5,6,7,8],{limit:1});assert(capped.truncated&&capped.overlaps.length===1);
console.log('Component planar collisions: crossing, containment, duplicate, shared edges, point contact, cap and invalid-input controls passed');

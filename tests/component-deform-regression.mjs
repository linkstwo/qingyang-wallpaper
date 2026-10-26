import fs from 'node:fs';import assert from 'node:assert/strict';
import {buildComponentJunction} from '../character-prototype/preview/component-junction.mjs';
import {deformComponentJunction} from '../character-prototype/preview/component-deform.mjs';
import {similarityPoint} from '../character-prototype/preview/parts-warp.mjs';
const parts=JSON.parse(fs.readFileSync('references/derived/side-b-cutout-manifest.json')).components,mesh=buildComponentJunction(parts),original=JSON.stringify(mesh),size=[1024,1536];
const handles=[{id:'nape',source:[700,380],target:[704,381]},{id:'shoulder',source:[800,450],target:[810,443]},{id:'elbow',source:[900,600],target:[894,603]},{id:'root',source:[660,500],target:[660,500]}];
const edges=new Map();for(let i=0;i<mesh.indices.length;i+=3)for(let j=0;j<3;j++){const ids=[mesh.indices[i+j],mesh.indices[i+(j+1)%3]].sort((a,b)=>a-b),key=ids.join(',');if(!edges.has(key))edges.set(key,[]);edges.get(key).push(mesh.triangleGroups[i/3]);}
const seam=[...edges].filter(([,g])=>g.length===2&&g[0]!==g[1]).map(([key])=>key.split(',').map(Number));assert(seam.length>3);
let min=Infinity;for(const gain of [0,.25,.55,1]){
 const warped=deformComponentJunction(mesh,handles,{size,gain});min=Math.min(min,warped.deformation.minimumAreaRatio);
 for(const key of ['indices','cornerUv','sourcePositions','triangleGroups','materials'])assert.deepEqual(warped[key],mesh[key]);
 if(gain===0)assert.deepEqual(warped.targetSourcePositions,mesh.sourcePositions);
 for(const ids of seam)for(const id of ids){const p=mesh.sourcePositions.slice(id*2,id*2+2),q=similarityPoint(p,handles);for(let k=0;k<2;k++)assert.equal(warped.targetSourcePositions[id*2+k],p[k]+(q[k]-p[k])*gain);}
 assert.equal(warped.registeredToMain,false);
}
// Independent crop deformation can separate the same physical seam even though
// each local field is a valid orientation-preserving translation.
const one=handles.map(h=>({...h,target:h.source.map((v,k)=>v+(k?0:12))})),two=handles.map(h=>({...h,target:h.source.map((v,k)=>v+(k?0:-12))}));
let naiveSeamGap=0;for(const id of new Set(seam.flat())){const p=mesh.sourcePositions.slice(id*2,id*2+2);naiveSeamGap=Math.max(naiveSeamGap,Math.hypot(...similarityPoint(p,one).map((v,k)=>v-similarityPoint(p,two)[k])));}assert(naiveSeamGap>23.9);
const reflected=handles.map(h=>({...h,target:[size[0]-h.source[0],h.source[1]]}));assert.throws(()=>deformComponentJunction(mesh,reflected,{size}),/folds|collapses/);
const duplicate=structuredClone(handles);duplicate[1].source=duplicate[0].source.slice();assert.throws(()=>deformComponentJunction(mesh,duplicate,{size}));
assert.throws(()=>deformComponentJunction(mesh,handles,{size,gain:NaN}));assert.throws(()=>deformComponentJunction({...mesh,indices:[0,1,NaN]},handles,{size}));
assert.equal(JSON.stringify(mesh),original,'failed and successful authoring must not mutate rest source');
const warped=deformComponentJunction(mesh,handles,{size,gain:.55});
fs.writeFileSync('validation/f14-component-deform.json',JSON.stringify({seamEdges:seam.length,naiveIndependentSeamGap:naiveSeamGap,gains:[0,.25,.55,1],minimumAreaRatio:min,sharedVertices:true,foldNegativeRejected:true,sourceUvExact:true,registeredToMain:false,selfIntersectionChecked:false,wholeT04Accepted:false,phoneTested:false},null,2)+'\n');
fs.writeFileSync('/tmp/f14-component-warp.json',JSON.stringify(warped));console.log(JSON.stringify({seamEdges:seam.length,naiveSeamGap,minimumAreaRatio:min}));

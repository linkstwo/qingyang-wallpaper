import fs from 'node:fs';import assert from 'node:assert/strict';
import {buildComponentJunction} from '../character-prototype/preview/component-junction.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('../references/derived/side-b-cutout-manifest.json',import.meta.url))),parts=manifest.components;
const mesh=buildComponentJunction(parts,{lift:([x,y])=>[x,y,.002*(x-750)**2+.001*(y-450)**2]});
const edges=new Map();for(let i=0;i<mesh.indices.length;i+=3)for(let k=0;k<3;k++){const a=mesh.indices[i+k],b=mesh.indices[i+(k+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');if(!edges.has(key))edges.set(key,[]);edges.get(key).push(mesh.triangleGroups[i/3]);}
const seam=[...edges.entries()].filter(([,groups])=>groups.length===2&&groups[0]!==groups[1]);assert(seam.length>3,'real shared boundary, not two disjoint cutouts');
assert([...edges.values()].every(g=>g.length<=2),'no duplicated overlap/nonmanifold edge');
let maxUvSourceError=0;for(let i=0;i<mesh.indices.length;i++){const c=parts[mesh.triangleGroups[Math.floor(i/3)]],id=mesh.indices[i];for(let k=0;k<2;k++)maxUvSourceError=Math.max(maxUvSourceError,Math.abs(mesh.cornerUv[i*2+k]*c.size[k]+c.originalCropRect[k]-mesh.sourcePositions[id*2+k]));}assert(maxUvSourceError<1e-8);
// A source-space overlap sample must be owned once, by the later arm material.
const pixel=[815,455],hits=[];for(let i=0;i<mesh.indices.length;i+=3){const [a,b,c]=mesh.indices.slice(i,i+3).map(id=>mesh.sourcePositions.slice(id*2,id*2+2)),cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]),s=[cross(a,b,pixel),cross(b,c,pixel),cross(c,a,pixel)];if(s.every(v=>v>1e-7)||s.every(v=>v< -1e-7))hits.push(mesh.triangleGroups[i/3]);}assert.deepEqual(hits,[1]);
// Independent source occupancy: polygon winding vs exported triangle coverage.
const polys=parts.map(c=>c.alphaPolygonLocal.map(p=>p.map((v,k)=>v+c.originalCropRect[k])));
const inside=(p,poly)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
const tris=[];for(let i=0;i<mesh.indices.length;i+=3){const q=mesh.indices.slice(i,i+3).map(id=>mesh.sourcePositions.slice(id*2,id*2+2));tris.push({q,minX:Math.min(...q.map(p=>p[0])),maxX:Math.max(...q.map(p=>p[0])),minY:Math.min(...q.map(p=>p[1])),maxY:Math.max(...q.map(p=>p[1]))});}
let gridSamples=0,naiveOverlapSamples=0;
for(let y=302.37;y<640;y+=3.1)for(let x=650.29;x<945;x+=3.1){const p=[x,y],expected=polys.some(poly=>inside(p,poly));if(polys.every(poly=>inside(p,poly)))naiveOverlapSamples++;let covered=false;
 for(const t of tris){if(x<t.minX||x>t.maxX||y<t.minY||y>t.maxY)continue;const [a,b,c]=t.q,cross=(a,b)=>(b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]),s=[cross(a,b),cross(b,c),cross(c,a)];if(s.every(v=>v>=-1e-6)||s.every(v=>v<=1e-6)){covered=true;break;}}
 assert.equal(covered,expected,'material clipping must not lose/add visible source coverage');gridSamples++;
}assert(naiveOverlapSamples>100,'negative: naive component concatenation double-covers observed pixels');
assert.throws(()=>buildComponentJunction([parts[0],{...parts[1],originalSourceSha256:'a'.repeat(64)}]));assert.throws(()=>buildComponentJunction(parts,{lift:()=>[NaN,0,0]}));
fs.writeFileSync(new URL('../references/derived/side-b-component-junction.json',import.meta.url),JSON.stringify(buildComponentJunction(parts))+'\n');
const result={gridSamples,naiveOverlapSamples,vertices:mesh.positions.length/3,triangles:mesh.indices.length/3,sharedSeamEdges:seam.length,maxUvSourceError,overlapOwnership:hits,wrongDonorRejected:true,sharedCurvedLift:true,depthInferred:true,registeredToMain:false,wholeT04Accepted:false,phoneTested:false};
fs.writeFileSync(new URL('../validation/f13-component-junction.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));

// Same-donor source topology only. This does not register a donor to the main pose.
import {makeMesh} from './rig.mjs';
import {subtractPolygon} from './layered-mesh.mjs';
import {conformSourceMesh} from './conforming-mesh.mjs';
import {improveSourceTriangles} from './quality-source-mesh.mjs';
export function buildComponentJunction(components,{edge=16,lift=p=>[...p,0]}={}){
 if(!Array.isArray(components)||components.length<2||components.length>8||!Number.isFinite(edge)||edge<4||edge>64||typeof lift!=='function')throw Error('Invalid component junction');
 const hash=components[0].originalSourceSha256;
 if(!/^[a-f0-9]{64}$/.test(hash)||components.some(c=>c.originalSourceSha256!==hash))throw Error('Junction requires the same verified donor; cross-view identity is not correspondence');
 const polygons=components.map(c=>{
  if(!Array.isArray(c.size)||c.size.length!==2||!c.size.every(v=>Number.isFinite(v)&&v>0)||!Array.isArray(c.originalCropRect)||c.originalCropRect.length!==4||!c.originalCropRect.every(Number.isFinite)||c.originalCropRect[2]-c.originalCropRect[0]!==c.size[0]||c.originalCropRect[3]-c.originalCropRect[1]!==c.size[1])throw Error('Invalid crop identity');
  if(!Array.isArray(c.alphaPolygonLocal)||c.alphaPolygonLocal.length<3||c.alphaPolygonLocal.some(p=>!Array.isArray(p)||p.length!==2||p.some((v,k)=>!Number.isFinite(v)||v<0||v>c.size[k])))throw Error('Invalid component boundary');
  return c.alphaPolygonLocal.map(p=>p.map((v,k)=>v+c.originalCropRect[k]));
 });
 const pieces=polygons.map((polygon,i)=>{let source=makeMesh(polygon,[],edge);for(let j=i+1;j<polygons.length;j++)source=subtractPolygon(source,polygons[j]);return source;});
 // Later material owns overlap exactly once. Conform before lifting so both
 // materials share each physical seam vertex even with different crop origins.
 const source=new Float32Array(pieces.reduce((n,p)=>n+p.length,0)),groups=[];let offset=0;
 pieces.forEach((p,i)=>{source.set(p,offset);offset+=p.length;groups.push(...Array(p.length/6).fill(i));});
 const mesh=improveSourceTriangles(conformSourceMesh(source,{triangleGroups:groups}));
 const positions=[];for(let i=0;i<mesh.positions.length;i+=2){const p=lift(mesh.positions.slice(i,i+2));if(!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))throw Error('Invalid shared lift');positions.push(...p);}
 const cornerUv=mesh.indices.flatMap((id,i)=>{const c=components[mesh.triangleGroups[Math.floor(i/3)]];return [0,1].map(k=>(mesh.positions[id*2+k]-c.originalCropRect[k])/c.size[k]);});
 if(cornerUv.some(v=>v< -1e-5||v>1+1e-5))throw Error('Material coordinate escapes its observed crop');
 return {version:1,sourceSha256:hash,sourcePositions:mesh.positions,positions,indices:mesh.indices,triangleGroups:mesh.triangleGroups,cornerUv,materials:components.map(c=>({id:c.id,path:c.path,sha256:c.sha256,confidence:0})),report:mesh.report,depthInferred:true,registeredToMain:false,newCameraAnglesClaimed:0};
}

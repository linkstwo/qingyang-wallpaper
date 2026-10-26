// Deform the shared donor topology once, not each cropped material separately.
// Authoring only: target coordinates do not establish cross-view correspondence.
import {similarityPoint,validateHandles} from './parts-warp.mjs';
export function deformComponentJunction(mesh,handles,{size,gain=1,minAreaRatio=.08}={}){
 if(!mesh||mesh.version!==1||!Array.isArray(mesh.sourcePositions)||mesh.sourcePositions.length<6||mesh.sourcePositions.length%2||!mesh.sourcePositions.every(Number.isFinite)||!Array.isArray(mesh.indices)||mesh.indices.length%3||!mesh.indices.length||mesh.indices.some(i=>!Number.isInteger(i)||i<0||i>=mesh.sourcePositions.length/2))throw Error('Invalid shared topology');
 if(!Array.isArray(size)||size.length!==2||!size.every(v=>Number.isFinite(v)&&v>0)||!Number.isFinite(gain)||gain<0||gain>1||!Number.isFinite(minAreaRatio)||minAreaRatio<=0||minAreaRatio>1)throw Error('Invalid shared deformation options');
 validateHandles(handles,size);
 if(mesh.sourcePositions.some((v,i)=>v<0||v>size[i%2]))throw Error('Shared topology escapes donor');
 const target=[];for(let i=0;i<mesh.sourcePositions.length;i+=2){const p=mesh.sourcePositions.slice(i,i+2),q=similarityPoint(p,handles);target.push(...p.map((v,k)=>v+(q[k]-v)*gain));}
 const area=(p,ids)=>{const [a,b,c]=ids.map(i=>p.slice(i*2,i*2+2));return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);};
 let minimumAreaRatio=Infinity,degenerateFaces=0;
 for(let i=0;i<mesh.indices.length;i+=3){const ids=mesh.indices.slice(i,i+3),before=area(mesh.sourcePositions,ids),after=area(target,ids);if(Math.abs(before)<1e-8){degenerateFaces++;continue;}minimumAreaRatio=Math.min(minimumAreaRatio,after/before);}
 if(degenerateFaces||!Number.isFinite(minimumAreaRatio)||minimumAreaRatio<minAreaRatio)throw Error('Shared component deformation folds or collapses; retain previous accepted authoring state');
 // Preserve all source UV/material/triangle identities. One target per shared
 // index is essential: independently cropped MLS fields can tear the junction.
 return {...mesh,targetSourcePositions:target,deformation:{method:'shared-donor-mls',gain,handles:structuredClone(handles),minimumAreaRatio,foldoverChecked:true,selfIntersectionChecked:false},registeredToMain:false,depthInferred:true};
}

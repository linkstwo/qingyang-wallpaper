// Source-observed layers. Subtraction creates real topology seams, not steep depth ramps.
import earcut from './earcut.mjs';
import {makeMesh} from './rig.mjs';
import {subject} from './subject.mjs';
const side=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
const area=p=>p.reduce((n,a,i)=>{const b=p[(i+1)%p.length];return n+a[0]*b[1]-a[1]*b[0];},0)/2;
function halfPlane(poly,a,b,inside){
 const out=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],sp=side(a,b,p),sq=side(a,b,q),ip=inside?sp>=0:sp<=0,iq=inside?sq>=0:sq<=0;
 if(ip)out.push(p);if(ip!==iq){const t=sp/(sp-sq);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}}
 return out.filter((p,i)=>i===0||Math.hypot(p[0]-out[i-1][0],p[1]-out[i-1][1])>1e-7);
}
function subtractConvex(poly,clip){
 let pending=poly;const pieces=[];
 for(let i=0;i<clip.length&&pending.length>=3;i++){const a=clip[i],b=clip[(i+1)%clip.length],outside=halfPlane(pending,a,b,false);if(outside.length>=3&&Math.abs(area(outside))>1e-6)pieces.push(outside);pending=halfPlane(pending,a,b,true);}
 return pieces;
}
export function subtractPolygon(mesh,outline){
 const flat=outline.flat(),ids=earcut(flat),clips=[];
 for(let i=0;i<ids.length;i+=3){const p=ids.slice(i,i+3).map(k=>flat.slice(k*2,k*2+2));if(area(p)<0)p.reverse();clips.push(p);}
 const result=[];
 for(let i=0;i<mesh.length;i+=6){let pieces=[[[mesh[i],mesh[i+1]],[mesh[i+2],mesh[i+3]],[mesh[i+4],mesh[i+5]]]];const orientation=Math.sign(area(pieces[0]));
 for(const clip of clips)pieces=pieces.flatMap(p=>subtractConvex(p,clip));
 for(const p of pieces){if(Math.sign(area(p))!==orientation)p.reverse();for(let k=1;k<p.length-1;k++){const tri=[p[0],p[k],p[k+1]];if(Math.abs(area(tri))>1e-6)result.push(...tri.flat());}}}
 return new Float32Array(result);
}
export function makeLayeredCharacterMesh(edge=27,paperOutline=subject.paper,additionalPaperOutlines=[]){const [w,h]=subject.canvas;let mesh=subtractPolygon(makeMesh([[0,0],[w,0],[w,h],[0,h]],[],edge),paperOutline);for(const outline of additionalPaperOutlines)mesh=subtractPolygon(mesh,outline);return mesh;}
export const layeredMeshVersion=2;

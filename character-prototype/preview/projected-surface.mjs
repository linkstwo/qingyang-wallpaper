// Source-camera ray queries on an indexed world surface. Used for registration,
// not a screen-space stand-in for hidden geometry or a production texture grant.
import {projectWorld,sceneModel} from './scene-model.mjs';
export function projectedSurface(positions,indices,cell=32){
 const projected=Array.from({length:positions.length/3},(_,i)=>projectWorld(positions.slice(i*3,i*3+3))),bins=new Map(),triangles=[];
 for(let i=0;i<indices.length;i+=3){const ids=indices.slice(i,i+3),p=ids.map(j=>projected[j]),den=(p[1][1]-p[2][1])*(p[0][0]-p[2][0])+(p[2][0]-p[1][0])*(p[0][1]-p[2][1]);if(den<=1e-10)continue;const n=triangles.length;triangles.push({id:i/3,ids,p,den});for(let x=Math.floor(Math.min(...p.map(q=>q[0]))/cell);x<=Math.floor(Math.max(...p.map(q=>q[0]))/cell);x++)for(let y=Math.floor(Math.min(...p.map(q=>q[1]))/cell);y<=Math.floor(Math.max(...p.map(q=>q[1]))/cell);y++){const k=x+','+y;if(!bins.has(k))bins.set(k,[]);bins.get(k).push(n);}}
 function nearest(x,y){let best=null;for(const n of bins.get(Math.floor(x/cell)+','+Math.floor(y/cell))||[]){const t=triangles[n],[a,b,c]=t.p,u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/t.den,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/t.den,w=1-u-v;if(Math.min(u,v,w)<-1e-7)continue;const inverseW=u/a[2]+v/b[2]+w/c[2],z=sceneModel.cameraDistance*(1-1/inverseW);if(!best||z>best.z)best={triangle:t.id,z,barycentric:[u,v,w]};}return best;}
 return {nearest,projected,triangles:triangles.length};
}

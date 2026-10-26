// S2 inferred joint surface. Shared lattice edges produce a single welded surface.
// This is untextured structural geometry, not a photographic body reconstruction.
import {sceneModel,buildThicknessProxy,unprojectSource,projectWorld} from './scene-model.mjs';
import {subject} from './subject.mjs';
import {polygonPin} from './contact-rig.mjs';
const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const d=Math.hypot(...a);return a.map(x=>x/Math.max(d,1e-20));},clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function capsule(p,a,b,ra,rb){const v=sub(b,a),t=clamp(dot(sub(p,a),v)/dot(v,v),0,1);return Math.hypot(...sub(p,mix(a,b,t)))-(ra+(rb-ra)*t);}
const smoothUnion=(a,b,k=16)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;};
export function makeStructuralField(){
 const arms=sceneModel.arms.map(a=>({...a,world:a.source.map((p,i)=>unprojectSource(...p,a.depths[i]))}));
 function distances(p){const [x,y]=projectWorld(p),ss=sceneModel.sections;let i=0;while(i<ss.length-2&&y>ss[i+1].y)i++;const a=ss[i],b=ss[i+1],t=clamp((y-a.y)/(b.y-a.y),0,1),v=k=>a[k]+(b[k]-a[k])*t,cx=v('cx'),rx=v('rx'),cz=v('cz'),rz=v('rz');
  const torso=Math.max((Math.hypot((x-cx)/rx,(p[2]-cz)/rz)-1)*Math.min(rx,rz),(ss[0].y-y)*.7,(y-ss.at(-1).y)*.7);
  return [torso,...arms.flatMap(a=>[capsule(p,a.world[0],a.world[1],a.radii[0],a.radii[1]),capsule(p,a.world[1],a.world[2],a.radii[1],a.radii[2])])];}
 return {arms,distances,value:p=>distances(p).reduce((a,b)=>smoothUnion(a,b))};
}
export function buildConnectedProxy(step=18){
 if(step<10||step>32)throw Error('Structural grid step must be10–32 source-world pixels');
 const legacy=buildThicknessProxy(),field=makeStructuralField(),lo=[0,1,2].map(k=>Math.floor((Math.min(...legacy.positions.filter((_,i)=>i%3===k))-step*3)/step)*step),hi=[0,1,2].map(k=>Math.ceil((Math.max(...legacy.positions.filter((_,i)=>i%3===k))+step*3)/step)*step),dims=lo.map((x,i)=>Math.round((hi[i]-x)/step)+1),[nx,ny,nz]=dims;
 const id=(x,y,z)=>(z*ny+y)*nx+x,point=n=>{const x=n%nx,y=Math.floor(n/nx)%ny,z=Math.floor(n/(nx*ny));return [lo[0]+x*step,lo[1]+y*step,lo[2]+z*step];};
 const values=new Float64Array(nx*ny*nz);for(let n=0;n<values.length;n++)values[n]=field.value(point(n))+.0137;
 const positions=[],indices=[],cache=new Map(),edge=(a,b)=>{const key=Math.min(a,b)+','+Math.max(a,b);if(cache.has(key))return cache.get(key);const t=values[a]/(values[a]-values[b]),p=mix(point(a),point(b),t),n=positions.length/3;positions.push(...p);cache.set(key,n);return n;};
 const tri=(a,b,c,out)=>{const p=[a,b,c].map(i=>positions.slice(i*3,i*3+3)),n=cross(sub(p[1],p[0]),sub(p[2],p[0]));if(Math.hypot(...n)<1e-10)return;if(dot(n,out)<0)indices.push(a,c,b);else indices.push(a,b,c);};
 const tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]],offsets=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
 for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
  const cube=offsets.map(([dx,dy,dz])=>id(x+dx,y+dy,z+dz));if(cube.every(n=>values[n]>=0)||cube.every(n=>values[n]<0))continue;
  for(const tet of tets){const ids=tet.map(i=>cube[i]),inside=ids.filter(n=>values[n]<0),outside=ids.filter(n=>values[n]>=0);if(!inside.length||!outside.length)continue;
   const mean=a=>a.reduce((p,n)=>p.map((v,k)=>v+point(n)[k]/a.length),[0,0,0]),out=sub(mean(outside),mean(inside));
   if(inside.length===1){const a=inside[0];tri(...outside.map(b=>edge(a,b)),out);}else if(outside.length===1){const a=outside[0];tri(...inside.map(b=>edge(a,b)),out);}else{const [a,b]=inside,[c,d]=outside,A=edge(a,c),B=edge(a,d),C=edge(b,c),D=edge(b,d);tri(A,B,C,out);tri(B,D,C,out);}
  }
 }
 const normals=Array(positions.length).fill(0);for(let j=0;j<indices.length;j+=3){const ids=indices.slice(j,j+3),p=ids.map(i=>positions.slice(i*3,i*3+3)),n=cross(sub(p[1],p[0]),sub(p[2],p[0]));for(const i of ids)for(let k=0;k<3;k++)normals[i*3+k]+=n[k];}
 for(let i=0;i<normals.length;i+=3)normals.splice(i,3,...unit(normals.slice(i,i+3)));
 const uv=[],confidence=[],region=[],skinWeights=[],supportWeights=[],hand=subject.contacts.find(r=>r.name==='holding-hand');
 for(let i=0;i<positions.length;i+=3){const p=positions.slice(i,i+3),q=projectWorld(p),ds=field.distances(p),min=Math.min(...ds),w=ds.map(d=>Math.exp(-Math.min(80,Math.max(0,d-min)/24))),sum=w.reduce((a,b)=>a+b),t=clamp((q[1]-420)/170,0,1),head=1-t*t*(3-2*t);uv.push(q[0]/1152,q[1]/1536);confidence.push(0);region.push(ds.indexOf(min)===0?1:ds.indexOf(min)<3?2:3);skinWeights.push(head,w[0]/sum*(1-head),...w.slice(1).map(v=>v/sum*(1-head)));}
 for(let i=0;i<uv.length;i+=2)supportWeights.push(polygonPin(uv[i]*1152,uv[i+1]*1536,hand.outline,hand.feather));
 const bones=[{name:'head',parent:1},{name:'torso',parent:-1},{name:'far-upper-arm',parent:1},{name:'far-forearm',parent:2},{name:'near-upper-arm',parent:1},{name:'near-forearm',parent:4}];
 return {version:3,samples:32,grid:{step,dims,bounds:[lo,hi]},positions,normals,uv,confidence,region,indices,skinWeights,supportWeights,bones,parts:[{name:'welded-inferred-body',firstVertex:0,vertexCount:positions.length/3,firstIndex:0,indexCount:indices.length,hiddenTextureReady:false}],limitations:['Inferred smooth-union structure, not a reconstructed body.','Every UV is untrusted until source registration; hidden photo textures are not drawn.','Voxel resolution approximates surface shape; production front photograph remains unchanged.']};
}

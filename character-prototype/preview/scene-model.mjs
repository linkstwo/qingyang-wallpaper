// Calibrated source-pixel camera and connected inferred thickness proxies for S2.
// Main-view UV is observed. Hidden surfaces are explicitly untextured until S3.
import {subject} from './subject.mjs';
import {bodySupportDepthWeight} from './contact-rig.mjs';
// Production angle is bounded by the current front/paper occlusion seam.
// Wider structural debug views do not establish trusted textured views.
export const sceneModel={version:2,units:'source pixels, +Z toward viewer',pivot:[790,1110],cameraDistance:2300,yawRadians:.04,pitchRadians:.02,depthClip:{nearWorldZ:1000,farWorldZ:-2000,numerator:[4250,-14],denominator:17250},
 paper:{sourceAnchor:[330,990],depth:180,slopeY:.12,referenceY:1000},seat:{sourceAnchor:[500,1450],depth:40,transition:[1270,1410]},
 sections:[
 {y:12,cx:585,rx:160,cz:35,rz:75,region:'head'},
 {y:85,cx:570,rx:245,cz:45,rz:110,region:'head'},
 {y:210,cx:550,rx:220,cz:50,rz:105,region:'head'},
 {y:335,cx:580,rx:175,cz:55,rz:85,region:'head'},
 {y:415,cx:650,rx:110,cz:60,rz:60,region:'neck'},
 {y:465,cx:725,rx:82,cz:65,rz:48,region:'neck'},
 {y:520,cx:750,rx:178,cz:60,rz:65,region:'torso'},
 {y:650,cx:745,rx:220,cz:52,rz:80,region:'torso'},
 {y:790,cx:755,rx:240,cz:45,rz:95,region:'torso'},
 {y:945,cx:790,rx:210,cz:40,rz:82,region:'torso'},
 {y:1100,cx:830,rx:180,cz:30,rz:60,region:'waist'}],
 arms:[{name:'far-arm',source:[[590,535],[635,920],[350,1005]],depths:[95,125,180.6],radii:[42,38,27],observed:[false,false,true]},
 {name:'near-arm',source:[[940,490],[1085,1030],[1150,1490]],depths:[115,95,55],radii:[68,52,32],observed:[true,true,false]}],
 limitations:['Cross-sections/thickness are inferred proxies, not a reconstructed body.','Hidden side/back UV confidence is zero; do not sample a stretched main photo there.','Parts overlap at attachment regions but are not welded into one manifold.']};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function supportDepth(x,y){const s=smooth(...sceneModel.seat.transition,y),d=sceneModel.cameraDistance,p=sceneModel.paper,refWorldY=(p.referenceY-sceneModel.pivot[1])*(d-p.depth)/d,intercept=p.depth-p.slopeY*refWorldY,sourceY=y-sceneModel.pivot[1],paper=(intercept+p.slopeY*sourceY)/(1+p.slopeY*sourceY/d);return paper*(1-s)+sceneModel.seat.depth*s;}
export function materialDepthAt(x,y,shapeDepth,supportFeather=120){const pin=bodySupportDepthWeight(x,y,supportFeather);return shapeDepth*(1-pin)+supportDepth(x,y)*pin;}
export function unprojectSource(x,y,z){const k=(sceneModel.cameraDistance-z)/sceneModel.cameraDistance;return [(x-sceneModel.pivot[0])*k,(y-sceneModel.pivot[1])*k,z];}
// Affine homogeneous clip Z, with world near +1000 and far -2000. Multiplying
// clip Z by clip W again would make coplanar depth depend on tessellation.
export function clipDepth(z){return (4250-14*z)/17250;}
export function ndcDepth(z){return clipDepth(z)/((sceneModel.cameraDistance-z)/sceneModel.cameraDistance);}
export function rotateScene(p,view){const a=clamp(view[0],-1,1)*sceneModel.yawRadians,b=clamp(view[1],-1,1)*sceneModel.pitchRadians,c=Math.cos(a),s=Math.sin(a),cx=Math.cos(b),sx=Math.sin(b),x=c*p[0]+s*p[2],z=-s*p[0]+c*p[2];return [x,cx*p[1]-sx*z,sx*p[1]+cx*z];}
export function projectWorld(p,view=[0,0]){const q=rotateScene(p,view),w=(sceneModel.cameraDistance-q[2])/sceneModel.cameraDistance;return [q[0]/w+sceneModel.pivot[0],q[1]/w+sceneModel.pivot[1],w];}
export function projectSource(x,y,z,view=[0,0],dz=0){const p=unprojectSource(x,y,z);p[2]+=dz;return projectWorld(p,view);}
export function rigidHeadCamera(x,y,view){const h=subject.head,[hx,hy]=h.anchor,a=projectSource(hx,hy,h.depth,view),r=unprojectSource(hx,hy,h.depth),b=projectWorld([r[0],r[1]+100,r[2]],view),angle=Math.atan2(-(b[0]-a[0]),b[1]-a[1]),c=Math.cos(angle),s=Math.sin(angle),dx=x-hx,dy=y-hy;return [a[0]+c*dx-s*dy,a[1]+s*dx+c*dy];}
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((v,n,i)=>v+n*b[i],0);
const normal=v=>{const l=Math.hypot(...v);return v.map(x=>x/Math.max(l,1e-12));};
export function buildThicknessProxy(samples=32){
 const positions=[],uv=[],confidence=[],region=[],indices=[],parts=[];
 const add=(p,label,trust=0)=>{const q=projectWorld(p);positions.push(...p);uv.push(q[0]/1152,q[1]/1536);confidence.push(trust);region.push(label);return positions.length/3-1;};
 function ringsPart(name,rings,label){const first=positions.length/3,start=indices.length;for(const ring of rings)for(const v of ring)add(v.p,label,v.trust);for(let row=0;row<rings.length-1;row++)for(let k=0;k<samples;k++){const a=first+row*samples+k,b=first+row*samples+(k+1)%samples,c=a+samples,d=b+samples;indices.push(a,b,c,b,d,c);}for(const row of [0,rings.length-1]){const center=[0,0,0];for(const v of rings[row])v.p.forEach((n,i)=>center[i]+=n/samples);const c=add(center,label,0);for(let k=0;k<samples;k++){const a=first+row*samples+k,b=first+row*samples+(k+1)%samples;indices.push(...(row===0?[c,b,a]:[c,a,b]));}}parts.push({name,firstVertex:first,vertexCount:positions.length/3-first,firstIndex:start,indexCount:indices.length-start,hiddenTextureReady:false});}
 const body=sceneModel.sections.map(s=>Array.from({length:samples},(_,i)=>{const t=i/samples*Math.PI*2,z=s.cz+s.rz*Math.cos(t),x=s.cx+s.rx*Math.sin(t);return {p:unprojectSource(x,s.y,z),trust:Math.cos(t)>.2?.7:0};}));ringsPart('head-neck-torso',body,1);
 for(const [armIndex,a] of sceneModel.arms.entries()){
  const centers=a.source.map((p,i)=>unprojectSource(...p,a.depths[i]));const rings=centers.map((c,row)=>{const axis=normal(sub(centers[Math.min(centers.length-1,row+1)],centers[Math.max(0,row-1)])),u=normal(cross(axis,[0,0,1])),v=normal(cross(axis,u));return Array.from({length:samples},(_,i)=>{const t=i/samples*Math.PI*2,p=c.map((n,k)=>n+a.radii[row]*(u[k]*Math.cos(t)+v[k]*Math.sin(t)));return {p,trust:a.observed[row]&&p[2]>=c[2]?.5:0};});});ringsPart(a.name,rings,armIndex+2);
 }
 // Orient and accumulate geometric normals. Each part is closed; material availability stays explicit.
 const normals=Array(positions.length).fill(0);
 for(let i=0;i<indices.length;i+=3){const ids=indices.slice(i,i+3),p=ids.map(n=>positions.slice(n*3,n*3+3)),n=cross(sub(p[1],p[0]),sub(p[2],p[0]));for(const id of ids)for(let k=0;k<3;k++)normals[id*3+k]+=n[k];}
 for(let i=0;i<normals.length;i+=3)normals.splice(i,3,...normal(normals.slice(i,i+3)));
 return {version:1,samples,positions,normals,uv,confidence,region,indices,parts,limitations:sceneModel.limitations};
}

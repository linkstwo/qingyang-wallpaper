// Bounded S2 bone motion for the inferred joined surface. Separate from camera/Q solver.
import {sceneModel,unprojectSource,projectWorld} from './scene-model.mjs';
import {subject} from './subject.mjs';
import {polygonPin} from './contact-rig.mjs';
const sub=(a,b)=>a.map((v,i)=>v-b[i]),add=(a,b)=>a.map((v,i)=>v+b[i]),mul=(a,t)=>a.map(v=>v*t),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>Math.hypot(...a),unit=a=>mul(a,1/Math.max(norm(a),1e-20)),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function solveSupportedArm(rest,shoulder){const [a,e,w]=rest,L=norm(sub(e,a)),F=norm(sub(w,e)),axis=unit(sub(w,shoulder)),d=norm(sub(w,shoulder)),reach=clamp(d,Math.abs(L-F)+1e-8,L+F-1e-8),along=(L*L-F*F+reach*reach)/(2*reach),height=Math.sqrt(Math.max(0,L*L-along*along)),base=add(shoulder,mul(axis,along));let bend=sub(sub(e,base),mul(axis,dot(sub(e,base),axis)));if(norm(bend)<1e-10)bend=cross(axis,[0,0,1]);const elbow=add(base,mul(unit(bend),height));return {points:[shoulder,elbow,w],reachable:d>=Math.abs(L-F)&&d<=L+F,lengths:[L,F]};}
function align(v,from,to){const a=unit(from),b=unit(to),c=dot(a,b);if(c>1-1e-14)return v;if(c< -1+1e-10){let axis=cross(a,[1,0,0]);if(norm(axis)<.01)axis=cross(a,[0,1,0]);axis=unit(axis);return sub(mul(axis,2*dot(v,axis)),v);}const k=cross(a,b);return add(add(v,cross(k,v)),mul(cross(k,cross(k,v)),1/(1+c)));}
function segmentMatrix(a,b,qa,qb){const cols=[[1,0,0],[0,1,0],[0,0,1]].map(v=>align(v,sub(b,a),sub(qb,qa))),apply=p=>[0,1,2].map(k=>cols[0][k]*p[0]+cols[1][k]*p[1]+cols[2][k]*p[2]);return {cols,translation:sub(qa,apply(a))};}
const apply=(m,p)=>[0,1,2].map(k=>m.cols[0][k]*p[0]+m.cols[1][k]*p[1]+m.cols[2][k]*p[2]+m.translation[k]);
export function structuralPose(input={}){
 const yaw=clamp(input.yaw||0,-.06,.06),pitch=clamp(input.pitch||0,-.04,.04),roll=clamp(input.roll||0,-.035,.035),pivot=unprojectSource(830,1100,30);
 const rotate=p=>{const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch),cz=Math.cos(roll),sz=Math.sin(roll),x=cy*p[0]+sy*p[2],z=-sy*p[0]+cy*p[2],y=cx*p[1]-sx*z,Z=sx*p[1]+cx*z;return [cz*x-sz*y,sz*x+cz*y,Z];};
 const torso={cols:[[1,0,0],[0,1,0],[0,0,1]].map(rotate),translation:sub(pivot,rotate(pivot))},matrices=[torso,torso],arms=[];
 for(const a of sceneModel.arms){const rest=a.source.map((p,i)=>unprojectSource(...p,a.depths[i]));let pose;
  if(a.observed.at(-1))pose=solveSupportedArm(rest,apply(torso,rest[0]));else pose={points:rest.map(p=>apply(torso,p)),reachable:true,lengths:[norm(sub(rest[1],rest[0])),norm(sub(rest[2],rest[1]))]};
  if(a.observed.at(-1)){matrices.push(segmentMatrix(rest[0],rest[1],pose.points[0],pose.points[1]),segmentMatrix(rest[1],rest[2],pose.points[1],pose.points[2]));}else matrices.push(torso,torso);
  arms.push({name:a.name,rest,...pose,wristObserved:a.observed.at(-1)});
 }
 return {matrices,arms,pivot,angles:[yaw,pitch,roll],rest:!yaw&&!pitch&&!roll};
}
export function poseConnectedProxy(model,input={}){
 const pose=structuralPose(input);if(pose.rest)return {positions:model.positions.slice(),pose,maxPinnedError:0};const positions=[],hand=subject.contacts.find(r=>r.name==='holding-hand');let maxPinnedError=0;
 for(let i=0;i<model.positions.length/3;i++){const p=model.positions.slice(i*3,i*3+3),q=[0,0,0];for(let b=0;b<6;b++){const w=model.skinWeights[i*6+b];if(w){const x=apply(pose.matrices[b],p);for(let k=0;k<3;k++)q[k]+=x[k]*w;}}
  const source=projectWorld(p),pin=model.supportWeights?.[i]??polygonPin(...source.slice(0,2),hand.outline,hand.feather),out=q.map((v,k)=>v*(1-pin)+p[k]*pin);if(pin===1)maxPinnedError=Math.max(maxPinnedError,norm(sub(out,p)));positions.push(...out);
 }
 return {positions,pose,maxPinnedError};
}
// Column-major GLES2 mat4s, world-space rest -> posed world. No hidden parent transforms.
export function poseUniforms(input={}){return structuralPose(input).matrices.map(m=>new Float32Array([...m.cols[0],0,...m.cols[1],0,...m.cols[2],0,...m.translation,1]));}

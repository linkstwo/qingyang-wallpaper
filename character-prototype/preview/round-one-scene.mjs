// First integrated candidate. Surface shape/landmarks are authored estimates.
// Real donor pixels participate on a curved side strip, never a whole-image fade.
import {buildObservedScene} from './observed-scene.mjs';
import {paperWideCandidate} from './paper-candidate-config.mjs';
import {depthAt,deformPoint} from './structure.mjs';
import {unprojectSource,projectWorld} from './scene-model.mjs';
export const roundOne={version:1,source:'references/derived/side-b-shoulder-back.png',sourceSha256:'75d3831e06d808247e386b8dfbdec5dcad190225c66c51bb47bbab8be5a56e56',sourceSize:[440,750],yawRadians:.24,pitchRadians:.02,accepted:false,
 limitations:['Side/back association and depth are authored, not measured/calibrated.','Donor arm bends; only its visible torso strip is used.','Colour/contour refinements and phone acceptance are deferred.']};
// x,y = current main-image outer contour; left/right = observed donor torso rails.
// The attachment starts at the shoulder and ends before the cropped near elbow.
export const sideRows=[
 {main:[960,430],left:[188,58],right:[193,58],depth:6,inset:1},
 {main:[1006,463],left:[219,99],right:[235,99],depth:65,inset:5},
 {main:[1039,519],left:[237,163],right:[263,163],depth:125,inset:10},
 {main:[1060,599],left:[239,245],right:[283,245],depth:180,inset:17},
 {main:[1078,709],left:[232,348],right:[306,348],depth:220,inset:23},
 {main:[1095,849],left:[215,451],right:[325,451],depth:230,inset:26},
 {main:[1115,1005],left:[183,551],right:[349,551],depth:165,inset:21},
 {main:[1137,1190],left:[215,655],right:[218,655],depth:5,inset:1}
];
export function buildSideBackStrip(columns=12){
 const positions=[],uv=[],attachment=[],indices=[],source=[],depth=[];
 for(const row of sideRows)for(let col=0;col<=columns;col++){
  const t=col/columns,[x,y]=row.main,z0=depthAt(x,y,160),z=z0-row.depth*Math.sin(t*Math.PI*.5),sx=x-row.inset*t;
  positions.push(...unprojectSource(sx,y,z));source.push(sx,y);depth.push(z);
  uv.push((row.left[0]+(row.right[0]-row.left[0])*t)/440,row.left[1]/750);
  attachment.push(t===0?1:0);
 }
 for(let row=0;row<sideRows.length-1;row++)for(let col=0;col<columns;col++){
  const a=row*(columns+1)+col,b=a+1,c=a+columns+1,d=c+1;indices.push(a,b,c,b,d,c);
 }
 return {positions,source,depth,uv,attachment,indices,columns,depthInferred:true,donorRegistration:'authored_first_pass',sourceSha256:roundOne.sourceSha256};
}
export function buildRoundOneScene(){return {...buildObservedScene(paperWideCandidate.scene),sideBack:buildSideBackStrip(),roundOne};}
export function sideBackProjected(mesh,view,body=[0,0],gain=1){
 return mesh.depth.map((z,i)=>deformPoint(...mesh.source.slice(i*2,i*2+2),z,[0,0],body,[0,0,0],[0,0],gain,0,false)).map((p,i)=>{
  const w=unprojectSource(...p,mesh.depth[i]),a=view[0]*roundOne.yawRadians,b=view[1]*roundOne.pitchRadians,c=Math.cos(a),s=Math.sin(a),cx=Math.cos(b),sx=Math.sin(b),x=c*w[0]+s*w[2],zz=-s*w[0]+c*w[2],y=cx*w[1]-sx*zz,z=sx*w[1]+cx*zz,k=(2300-z)/2300;
  return [x/k+790,y/k+1110];
 });
}

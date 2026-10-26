// Photo-traced visible skin boundary; depth is inferred. Research only.
// The proximal elbow is occluded by the sleeve, not an observed landmark.
import {makeMesh} from './rig.mjs';
import {makeLayeredCharacterMesh,subtractPolygon} from './layered-mesh.mjs';
import {subject} from './subject.mjs';
import {conformSourceMesh} from './conforming-mesh.mjs';
import {improveSourceTriangles} from './quality-source-mesh.mjs';
import {depthAt} from './structure.mjs';
import {materialDepthAt} from './scene-model.mjs';
export const forearmOutline=[[350,940],[400,929],[425,929],[450,920],[485,915],[510,905],[525,900],[540,906],[555,925],[575,942],[595,955],[610,974],[615,980],[600,986],[575,990],[550,994],[525,997],[500,1000],[475,1002],[450,1010],[425,1025],[400,1030],[375,1022],[350,1010]];
export function insideForearm(x,y){let yes=false;for(let i=0,j=forearmOutline.length-1;i<forearmOutline.length;j=i++){const a=forearmOutline[i],b=forearmOutline[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
export function forearmSurfaceDepth(x,y){
 const a=subject.arm.elbow,b=subject.arm.wrist,dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy))),distance=Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
 // Broad bounded cap, independent of the background depth on the other side
 // of the observed silhouette. A single sheet cannot represent that occlusion.
 const z=125+55.6*t+(38-11*t)*Math.sqrt(Math.max(0,1-(distance/60)**2));
 return materialDepthAt(x,y,z);
}
export const segmentedFrontDepthAt=(x,y)=>insideForearm(x,y)?forearmSurfaceDepth(x,y):depthAt(x,y);
export function buildForearmSourcePieces(){
 const base=makeLayeredCharacterMesh(),body=improveSourceTriangles(conformSourceMesh(subtractPolygon(base,forearmOutline))),arm=improveSourceTriangles(conformSourceMesh(subtractPolygon(makeMesh(forearmOutline,[],12),subject.paper)));
 return {body,arm,source:'references/originals/main-reading-v2.png',depthInferred:true,productionUsed:false};
}

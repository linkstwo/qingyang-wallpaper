// Conservative photo-traced component cut; some edges lie inside visible skin.
// It is not an accepted full anatomical silhouette. Depth is inferred. Research only.
// The proximal elbow is occluded by the sleeve, not an observed landmark.
import {makeMesh} from './rig.mjs';
import {makeLayeredCharacterMesh,makePaperNotchedCharacterMesh,subtractPolygon} from './layered-mesh.mjs?paper=10b';
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
export function buildForearmSourcePieces({paperOutline=subject.paper,additionalPaperOutlines=[],paperNotch=false}={}){
 let base=paperNotch?makePaperNotchedCharacterMesh(paperOutline):makeLayeredCharacterMesh(27,paperOutline,additionalPaperOutlines);if(paperNotch)for(const outline of additionalPaperOutlines)base=subtractPolygon(base,outline);const bodySource=subtractPolygon(base,forearmOutline);let armSource=subtractPolygon(makeMesh(forearmOutline,[],12),paperOutline);for(const outline of additionalPaperOutlines)armSource=subtractPolygon(armSource,outline);const joined=new Float32Array(bodySource.length+armSource.length);joined.set(bodySource);joined.set(armSource,bodySource.length);
 // Weld source coordinates jointly, while retaining distinct material/depth
 // labels. Independent subdivisions otherwise leave unmatched boundary points.
 const shared=improveSourceTriangles(conformSourceMesh(joined,{triangleGroups:Array(bodySource.length/6).fill(0).concat(Array(armSource.length/6).fill(1))}));
 function piece(group){const indices=[];for(let i=0;i<shared.triangleGroups.length;i++)if(shared.triangleGroups[i]===group)indices.push(...shared.indices.slice(i*3,i*3+3));return {positions:shared.positions,indices,source:new Float32Array(indices.flatMap(i=>shared.positions.slice(i*2,i*2+2))),report:{...shared.report,triangles:indices.length/3}};}
 return {body:piece(0),arm:piece(1),shared,source:'references/originals/main-reading-v2.png',depthInferred:true,productionUsed:false};
}

// Align the body side of a conservative component cut to the same depth at
// its shared boundary. The outer collar is inferred; no new texture is added.
export function forearmJunctionDepth(x,y,base=depthAt,width=64){
 if(![x,y,width].every(Number.isFinite)||width<16||width>128)throw Error('Invalid forearm junction sample');
 if(insideForearm(x,y))return forearmSurfaceDepth(x,y);let distance=Infinity;
 for(let i=0;i<forearmOutline.length;i++){const a=forearmOutline[i],b=forearmOutline[(i+1)%forearmOutline.length],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));distance=Math.min(distance,Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy));}
 const t=Math.min(1,distance/width),blend=1-t*t*(3-2*t),z=base(x,y);return z+(forearmSurfaceDepth(x,y)-z)*blend;
}

// Observed photograph surfaces in the structural scene. Research only.
// The rear proxy is not yet welded/registered to these front surfaces.
import {nearArmDepthAt} from './near-arm-surface.mjs';
import {buildUnderHandBackground} from './observed-background.mjs';
import {subject} from './subject.mjs';import {makeMesh} from './rig.mjs';
import {makeLayeredCharacterMesh,makePaperNotchedCharacterMesh,subtractPolygon} from './layered-mesh.mjs?paper=10b';
import {makeStructuralField,structuralSkinWeights} from './connected-proxy.mjs';
import {depthAt} from './structure.mjs';import {supportDepth,unprojectSource,projectWorld} from './scene-model.mjs';
import {polygonPin,bodyContactPin} from './contact-rig.mjs';
import {conformSourceMesh} from './conforming-mesh.mjs';
import {improveSourceTriangles} from './quality-source-mesh.mjs';
import {buildForearmSourcePieces,forearmSurfaceDepth} from './forearm-surface.mjs?paper=10b';
import {paperSourcePartition,paperLapContactWeight,paperExteriorCollars,paperLeftBackgroundOutline,paperUnderHandBackgroundOutline} from './paper-source-partition.mjs';
// Split all material boundaries together before lifting them into depth.
// Only explicit contact edges share 3D positions; occlusion edges stay separate.
function conformObservedPieces(pieces){
 const mesh=new Float32Array(pieces.reduce((n,p)=>n+p.length,0)),groups=[];let offset=0;
 pieces.forEach((p,group)=>{mesh.set(p,offset);offset+=p.length;groups.push(...Array(p.length/6).fill(group));});
 const shared=improveSourceTriangles(conformSourceMesh(mesh,{triangleGroups:groups})),result=pieces.map(()=>[]);
 let degenerateSourceArea=0,droppedDegenerateFaces=0;for(let i=0;i<shared.indices.length;i+=3){const pts=shared.indices.slice(i,i+3).map(id=>shared.positions.slice(id*2,id*2+2)),area=Math.abs((pts[1][0]-pts[0][0])*(pts[2][1]-pts[0][1])-(pts[1][1]-pts[0][1])*(pts[2][0]-pts[0][0])),edges=pts.reduce((n,p,j)=>n+(p[0]-pts[(j+1)%3][0])**2+(p[1]-pts[(j+1)%3][1])**2,0);if(area/Math.max(edges,1e-30)<1e-6){degenerateSourceArea+=area/2;droppedDegenerateFaces++;continue;}const out=result[shared.triangleGroups[i/3]];for(const id of shared.indices.slice(i,i+3))out.push(...shared.positions.slice(id*2,id*2+2));}
 return {pieces:result.map(p=>new Float32Array(p)),report:{...shared.report,droppedDegenerateFaces,degenerateSourceArea}};
}
export function buildObservedScene({forearmVolume=false,nearArmVolume=false,paperPartition=false,paperLapContact=false,paperRightClothContact=false,paperExteriorTrim=false,paperBackgroundTrim=false,paperUnderHandBackgroundTrim=false,paperUnderHandBackgroundPlane=false,seatSupport=false,lapContactWidth=48}={}){
 if(!Number.isFinite(lapContactWidth)||lapContactWidth<8||lapContactWidth>256)throw Error('Invalid lap contact width');
 const background=paperPartition&&paperUnderHandBackgroundTrim&&paperUnderHandBackgroundPlane?buildUnderHandBackground():null;
 const field=makeStructuralField(),hand=subject.contacts.find(c=>c.name==='holding-hand'),paperOutline=paperPartition?paperSourcePartition.outline:subject.paper,additionalPaperOutlines=paperPartition&&paperExteriorTrim?paperExteriorCollars():[];
 // Only observed paper belongs to the support plane. The old polygon and
 // motion-matte collar contain background/cloth and must not be unioned here.
 if(paperPartition&&paperBackgroundTrim)additionalPaperOutlines.push(paperLeftBackgroundOutline);
 if(paperPartition&&paperUnderHandBackgroundTrim)additionalPaperOutlines.push(paperUnderHandBackgroundOutline);
 let paperMesh=Array.from(makeMesh(paperOutline));
 function surface(source,paper,target=nearArmVolume?nearArmDepthAt:depthAt){const positions=[],uv=[],skinWeights=[],supportWeights=[];for(let i=0;i<source.length;i+=2){const x=source[i],y=source[i+1],lap=paperLapContact&&!paper?paperLapContactWeight(x,y,lapContactWidth,{includeRightCloth:paperRightClothContact}):0,z=paper?supportDepth(x,y):target(x,y)*(1-lap)+supportDepth(x,y)*lap,p=unprojectSource(x,y,z);positions.push(...p);uv.push(x/1152,y/1536);skinWeights.push(...(paper?[0,0,0,0,0,0]:structuralSkinWeights(field,p)));supportWeights.push(paper?1:Math.max(lap,seatSupport?bodyContactPin(x,y):polygonPin(x,y,hand.outline,hand.feather)));}return {positions,uv,skinWeights,supportWeights,vertices:positions.length/3,paper,observed:true};}
 if(forearmVolume){const pieces=buildForearmSourcePieces({paperOutline,additionalPaperOutlines,paperNotch:paperPartition&&!paperExteriorTrim});let bodySource=pieces.body.source,armSource=pieces.arm.source;if(paperLapContact){const shared=conformObservedPieces([bodySource,armSource,paperMesh]);[bodySource,armSource,paperMesh]=shared.pieces;pieces.paperContactConformity=shared.report;}const body=surface(bodySource,false),arm=surface(armSource,false,forearmSurfaceDepth);for(const key of ['positions','uv','skinWeights','supportWeights'])body[key]=body[key].concat(arm[key]);const forearmFirstVertex=body.vertices;body.vertices+=arm.vertices;return {version:3,nearArmVolume,background,body,forearmFirstVertex,paper:surface(paperMesh,true),conformity:{body:pieces.body.report,forearm:pieces.arm.report,paperContact:pieces.paperContactConformity},forearmVolume:true,paperPartition,paperLapContact,paperRightClothContact,paperExteriorTrim,paperBackgroundTrim,paperUnderHandBackgroundTrim,source:pieces.source,limitations:['Photo-traced forearm boundary; depth and occluded elbow are inferred.','Front and rear remain separate; hidden texture confidence0.','Research only, production assets unchanged.']};}
 let sourceMesh=paperPartition&&!paperExteriorTrim?makePaperNotchedCharacterMesh(paperOutline):makeLayeredCharacterMesh(27,paperOutline,additionalPaperOutlines);
 if(paperPartition&&!paperExteriorTrim&&paperBackgroundTrim)sourceMesh=subtractPolygon(sourceMesh,paperLeftBackgroundOutline);
 if(paperPartition&&!paperExteriorTrim&&paperUnderHandBackgroundTrim)sourceMesh=subtractPolygon(sourceMesh,paperUnderHandBackgroundOutline);
 const conformed=conformSourceMesh(sourceMesh);if(paperLapContact){const shared=conformObservedPieces([conformed.source,paperMesh]);[conformed.source,paperMesh]=shared.pieces;conformed.report.paperContact=shared.report;}
 return {version:2,nearArmVolume,background,body:surface(conformed.source,false),paper:surface(paperMesh,true),conformity:conformed.report,paperPartition,paperLapContact,paperRightClothContact,paperExteriorTrim,paperBackgroundTrim,paperUnderHandBackgroundTrim,source:'references/originals/main-reading-v2.png',limitations:['Observed front photo surface and inferred back are separate, not a welded production manifold.','Head is a front photograph surface; hidden face/head remains untextured.','Rear chart remains provisional confidence0.','No production camera, source RGB or Q solver changed.']};
}
// Keep the inferred front cap from poking through the observed source at rest.
// This carves a diagnostic rear shell, not a welded front/rear completion.
export function rearProxyIndices(model,margin=2,target=depthAt){const behind=[];for(let i=0;i<model.positions.length/3;i++){const p=model.positions.slice(i*3,i*3+3),q=projectWorld(p);behind.push(p[2]<target(q[0],q[1])-margin);}const indices=[];for(let i=0;i<model.indices.length;i+=3){const tri=model.indices.slice(i,i+3);if(tri.every(j=>behind[j]))indices.push(...tri);}return new Uint16Array(indices);}

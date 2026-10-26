// Observed photograph surfaces in the structural scene. Research only.
// The rear proxy is not yet welded/registered to these front surfaces.
import {subject} from './subject.mjs';import {makeMesh} from './rig.mjs';
import {makeLayeredCharacterMesh,subtractPolygon} from './layered-mesh.mjs?paper=10b';
import {makeStructuralField,structuralSkinWeights} from './connected-proxy.mjs';
import {depthAt} from './structure.mjs';import {supportDepth,unprojectSource,projectWorld} from './scene-model.mjs';
import {polygonPin} from './contact-rig.mjs';
import {conformSourceMesh} from './conforming-mesh.mjs';
import {buildForearmSourcePieces,forearmSurfaceDepth} from './forearm-surface.mjs?paper=10b';
import {paperSourcePartition,paperAssignmentOutline} from './paper-source-partition.mjs';
export function buildObservedScene({forearmVolume=false,paperPartition=false}={}){
 const field=makeStructuralField(),hand=subject.contacts.find(c=>c.name==='holding-hand'),paperOutline=paperPartition?paperAssignmentOutline():subject.paper,additionalPaperOutlines=paperPartition?[subject.paper]:[];
 const paperMesh=Array.from(makeMesh(paperOutline));if(paperPartition)paperMesh.push(...subtractPolygon(makeMesh(subject.paper),paperOutline));
 function surface(source,paper,target=depthAt){const positions=[],uv=[],skinWeights=[],supportWeights=[];for(let i=0;i<source.length;i+=2){const x=source[i],y=source[i+1],z=paper?supportDepth(x,y):target(x,y),p=unprojectSource(x,y,z);positions.push(...p);uv.push(x/1152,y/1536);skinWeights.push(...(paper?[0,0,0,0,0,0]:structuralSkinWeights(field,p)));supportWeights.push(paper?1:polygonPin(x,y,hand.outline,hand.feather));}return {positions,uv,skinWeights,supportWeights,vertices:positions.length/3,paper,observed:true};}
 if(forearmVolume){const pieces=buildForearmSourcePieces({paperOutline,additionalPaperOutlines}),body=surface(pieces.body.source,false),arm=surface(pieces.arm.source,false,forearmSurfaceDepth);for(const key of ['positions','uv','skinWeights','supportWeights'])body[key]=body[key].concat(arm[key]);const forearmFirstVertex=body.vertices;body.vertices+=arm.vertices;return {version:3,body,forearmFirstVertex,paper:surface(paperMesh,true),conformity:{body:pieces.body.report,forearm:pieces.arm.report},forearmVolume:true,paperPartition,source:pieces.source,limitations:['Photo-traced forearm boundary; depth and occluded elbow are inferred.','Front and rear remain separate; hidden texture confidence0.','Research only, production assets unchanged.']};}
 const conformed=conformSourceMesh(makeLayeredCharacterMesh(27,paperOutline,additionalPaperOutlines));
 return {version:2,body:surface(conformed.source,false),paper:surface(paperMesh,true),conformity:conformed.report,paperPartition,source:'references/originals/main-reading-v2.png',limitations:['Observed front photo surface and inferred back are separate, not a welded production manifold.','Head is a front photograph surface; hidden face/head remains untextured.','Rear chart remains provisional confidence0.','No production camera, source RGB or Q solver changed.']};
}
// Keep the inferred front cap from poking through the observed source at rest.
// This carves a diagnostic rear shell, not a welded front/rear completion.
export function rearProxyIndices(model,margin=2,target=depthAt){const behind=[];for(let i=0;i<model.positions.length/3;i++){const p=model.positions.slice(i*3,i*3+3),q=projectWorld(p);behind.push(p[2]<target(q[0],q[1])-margin);}const indices=[];for(let i=0;i<model.indices.length;i+=3){const tri=model.indices.slice(i,i+3);if(tri.every(j=>behind[j]))indices.push(...tri);}return new Uint16Array(indices);}

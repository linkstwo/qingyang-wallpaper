// Explicit observed workshop pixels on a separate inferred background plane.
// No texture is supplied for newly exposed gaps outside these source polygons.
import {makeMesh} from './rig.mjs';
import {subtractPolygon} from './layered-mesh.mjs';
import {unprojectSource} from './scene-model.mjs';
import {paperUnderHandBackgroundOutline,paperSourcePartition} from './paper-source-partition.mjs';
export function buildUnderHandBackground({depth=-180}={}){
 if(!Number.isFinite(depth)||depth< -1500||depth> -20)throw Error('Invalid inferred background depth');
 const source=subtractPolygon(makeMesh(paperUnderHandBackgroundOutline,[],12),paperSourcePartition.outline),positions=[],uv=[];
 for(let i=0;i<source.length;i+=2){const [x,y]=source.slice(i,i+2);positions.push(...unprojectSource(x,y,depth));uv.push(x/1152,y/1536);}
 const vertices=positions.length/3;
 return {vertices,positions,uv,skinWeights:Array(vertices*6).fill(0),supportWeights:Array(vertices).fill(1),paper:false,background:true,observed:true,source:'references/originals/main-reading-v2.png',depthInferred:true,depth,hiddenTextureAdded:false,limitations:['Only this observed polygon has source texture.','The plane depth is inferred, not measured workshop geometry.','Disoccluded source regions outside the polygon remain untextured.']};
}

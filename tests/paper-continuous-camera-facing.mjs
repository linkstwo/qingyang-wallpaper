import fs from 'node:fs';
import {buildObservedScene} from '../character-prototype/preview/observed-scene.mjs';
import {paperWideCandidate} from '../character-prototype/preview/paper-candidate-config.mjs';
import {poseConnectedProxy} from '../character-prototype/preview/structural-pose.mjs';
import {cameraVectorExtrema,cameraTriangleFacing} from '../character-prototype/preview/continuous-camera-facing.mjs';
const matte=fs.readFileSync(process.env.PAPER_MATTE_BYTES);if(matte.length!==1152*1536)throw Error('Wrong matte dimensions');
const control=process.env.CONTINUOUS_CAMERA_CONTROL==='1',options={...paperWideCandidate.scene,...(control?{lapContactWidth:96,supportDepthFeather:120}:{} )},scene=buildObservedScene(options),domain={yaw:[-Math.PI/9,Math.PI/9],pitch:[-.02,.02]},rows=[];
const opaque=p=>matte[Math.max(0,Math.min(1535,Math.round(p[1])))*1152+Math.max(0,Math.min(1151,Math.round(p[0])))]>=254;
const poses=[-.059,0,.059].flatMap(yaw=>[-.04,0,.04].flatMap(pitch=>[-.034,0,.034].map(roll=>({yaw,pitch,roll}))));
for(const bodyPose of poses){let tested=0,failed=0,minRatioBound=Infinity,minSignedFacingRatio=Infinity,minClipZ=Infinity,maxClipZ=-Infinity,minW=Infinity;const failures=[];
 for(const s of [scene.body,scene.paper]){const posed=poseConnectedProxy(s,bodyPose).positions,clips=new Map();
  for(let i=0;i<s.vertices;i+=3){const uv=[0,1,2].map(k=>[s.uv[(i+k)*2]*1152,s.uv[(i+k)*2+1]*1536]),area=(uv[1][0]-uv[0][0])*(uv[2][1]-uv[0][1])-(uv[1][1]-uv[0][1])*(uv[2][0]-uv[0][0]);if(Math.abs(area)<1e-5)continue;if(!s.paper&&!uv.concat([[uv.reduce((n,p)=>n+p[0],0)/3,uv.reduce((n,p)=>n+p[1],0)/3]]).every(opaque))continue;
   const points=[0,1,2].map(k=>posed.slice((i+k)*3,(i+k)*3+3)),r=cameraTriangleFacing(points,{...domain,sourceArea2:area});tested++;minSignedFacingRatio=Math.min(minSignedFacingRatio,r.minimumFacing/Math.abs(area));minW=Math.min(minW,r.minW);if(r.areaRatioLowerBound!==null)minRatioBound=Math.min(minRatioBound,r.areaRatioLowerBound);if(!r.orientationPreserved){failed++;if(failures.length<8)failures.push({paper:s.paper,source:uv,minimumAt:r.minimumAt,minimumFacing:r.minimumFacing});}
   for(const p of points){const key=p.join(',');if(!clips.has(key))clips.set(key,cameraVectorExtrema(p,domain));const c=clips.get(key);minClipZ=Math.min(minClipZ,c.min);maxClipZ=Math.max(maxClipZ,c.max);}
  }
 }rows.push({bodyPose,tested,failed,minRatioBound,minSignedFacingRatio,minClipZ,maxClipZ,minW,failures});
}
const hasFailures=rows.some(r=>r.failed||r.minClipZ<=-2000||r.maxClipZ>=1000||r.minW<=0),report={control,sceneOptions:options,continuousCameraDomain:domain,bodyPoseCount:poses.length,bodyPoseDomainContinuousProven:false,method:'analytic extrema of rotated plane normal minus plane offset / distance, evaluated in Float64; positive homogeneous-W bound',matteFilter:'all vertices and centroid nearest sample >=254; transparent edge raster not covered',rows,hasFailures,selfIntersectionChecked:false,visualAcceptance:false,phoneTested:false,wholeT03Accepted:false};
fs.writeFileSync('validation/'+(control?'f14-continuous-camera-negative':'f14-continuous-camera')+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({bodyPoseCount:poses.length,failedPoses:rows.filter(r=>r.failed).length,minimumSignedFacingRatio:Math.min(...rows.map(r=>r.minSignedFacingRatio)),minimumRatioBound:Math.min(...rows.map(r=>r.minRatioBound)),clipZ:[Math.min(...rows.map(r=>r.minClipZ)),Math.max(...rows.map(r=>r.maxClipZ))],hasFailures}));process.exitCode=hasFailures?1:0;

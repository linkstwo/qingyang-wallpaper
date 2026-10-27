// Actual full-front scan, deliberately reporting failures rather than treating
// the pinned-edge regression as acceptance of every triangle/body pose.
import fs from 'node:fs';
import {buildObservedScene} from '../character-prototype/preview/observed-scene.mjs';
import {poseConnectedProxy} from '../character-prototype/preview/structural-pose.mjs';
const scene=buildObservedScene({nearArmVolume:process.env.NEAR_ARM_VOLUME==='1',paperUnderHandBackgroundTrim:process.env.PAPER_UNDER_HAND_BACKGROUND_TRIM==='1',paperBackgroundTrim:process.env.PAPER_BACKGROUND_TRIM==='1',paperRightClothContact:process.env.PAPER_RIGHT_CLOTH_CONTACT==='1',lapContactWidth:Number(process.env.PAPER_LAP_WIDTH||48),seatSupport:process.env.PAPER_SEAT_SUPPORT==='1',forearmVolume:process.env.PAPER_FOREARM_VOLUME==='1',paperPartition:true,paperLapContact:true,paperExteriorTrim:process.env.PAPER_EXTERIOR_TRIM!=='0'});
const area=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const matte=process.env.PAPER_MATTE_BYTES?fs.readFileSync(process.env.PAPER_MATTE_BYTES):null;if(matte&&matte.length!==1152*1536)throw Error('wrong source matte dimensions');
const inMatte=p=>matte[Math.max(0,Math.min(1535,Math.round(p[1])))*1152+Math.max(0,Math.min(1151,Math.round(p[0])))]>=254;
const rows=[];
const bodyInputs=process.env.PAPER_FULL_POSES==='1'?[-.059,0,.059].flatMap(yaw=>[-.04,0,.04].flatMap(pitch=>[-.034,0,.034].map(roll=>({yaw,pitch,roll})))):[-1,0,1].map(sign=>({yaw:sign*.059,pitch:0,roll:sign*.034}));
const cameraYaws=process.env.PAPER_PRODUCTION_ONLY==='1'?[-.04,0,.04]:[-.34906585,-.04,0,.04,.34906585];
for(const yaw of cameraYaws)for(const sign of [-1,0,1]){
 const camera=[yaw,sign*.02],c=Math.cos(camera[0]),s=Math.sin(camera[0]),cx=Math.cos(camera[1]),sx=Math.sin(camera[1]);
 const project=p=>{const x=c*p[0]+s*p[2],z=-s*p[0]+c*p[2],y=cx*p[1]-sx*z,zz=sx*p[1]+cx*z,w=(2300-zz)/2300;return [x/w+790,y/w+1110];};
 for(const bodyInput of bodyInputs){
  let minAreaRatio=Infinity,flipped=0,tested=0,worst=null;
  for(const surface of [scene.body,scene.paper]){
   const posed=poseConnectedProxy(surface,bodyInput).positions;
   for(let i=0;i<surface.vertices;i+=3){const source=[0,1,2].map(k=>[surface.uv[(i+k)*2]*1152,surface.uv[(i+k)*2+1]*1536]),base=area(...source);if(Math.abs(base)<1e-5)continue;if(matte&&!surface.paper&&!source.concat([[source.reduce((n,p)=>n+p[0],0)/3,source.reduce((n,p)=>n+p[1],0)/3]]).every(inMatte))continue;
    const target=[0,1,2].map(k=>project(posed.slice((i+k)*3,(i+k)*3+3))),ratio=area(...target)/base;tested++;if(ratio<=0)flipped++;
    if(ratio<minAreaRatio){minAreaRatio=ratio;worst={paper:surface.paper,source};}
   }
  }
  rows.push({camera,bodyYaw:bodyInput.yaw,bodyPitch:bodyInput.pitch,bodyRoll:bodyInput.roll,minAreaRatio,flipped,tested,worst});
 }
}
const report={nearArmVolume:process.env.NEAR_ARM_VOLUME==='1',paperUnderHandBackgroundTrim:process.env.PAPER_UNDER_HAND_BACKGROUND_TRIM==='1',paperBackgroundTrim:process.env.PAPER_BACKGROUND_TRIM==='1',paperRightClothContact:process.env.PAPER_RIGHT_CLOTH_CONTACT==='1',lapContactWidth:Number(process.env.PAPER_LAP_WIDTH||48),seatSupport:process.env.PAPER_SEAT_SUPPORT==='1',forearmVolume:process.env.PAPER_FOREARM_VOLUME==='1',paperExteriorTrim:process.env.PAPER_EXTERIOR_TRIM!=='0',rows,hasFailures:rows.some(r=>r.flipped>0),scanIncludesMaskedOutGeometry:!matte,maskVisibilityAcceptance:false,matteFilter:matte?"all three vertices and centroid nearest matte>=254; not a raster self-occlusion proof":null,wholeT03Accepted:false,productionUsed:false,phoneTested:false};
fs.writeFileSync(new URL('../validation/'+(process.env.PAPER_SCAN_REPORT|| (matte?'paper-contact-visible-pose-scan.json':'paper-contact-pose-scan.json')),import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({rows:rows.length,failedRows:rows.filter(r=>r.flipped>0).length,worst:rows.reduce((a,b)=>a.minAreaRatio<b.minAreaRatio?a:b)}));

process.exitCode=report.hasFailures?1:0;

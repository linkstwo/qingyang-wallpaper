// Invert the structural-lab projection at the supplied body pose.
import {poseConnectedProxy} from './structural-pose.mjs';
// Returns every geometric hit. The caller must apply the source matte alpha;
// a geometric hit alone is not a visible pixel or a seam-width measurement.
export function traceObservedSource(scene,pixel,{width=540,height=1176,yaw=0,pitch=0,bodyPose=null}={}){
 if(!Array.isArray(pixel)||pixel.length!==2||![...pixel,width,height,yaw,pitch].every(Number.isFinite)||width<=0||height<=0)throw Error('Invalid source-ray viewport/pixel');
 if(bodyPose&&Object.entries(bodyPose).some(([k,v])=>!['yaw','pitch','roll'].includes(k)||!Number.isFinite(v)))throw Error('Invalid source-ray body pose');
 const c=Math.cos(yaw),s=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch);
 const project=p=>{const x=c*p[0]+s*p[2],z=-s*p[0]+c*p[2],y=cx*p[1]-sx*z,zz=sx*p[1]+cx*z,w=(2300-zz)/2300;return [(.14+(x/w+790)/1600)*width,(.04+(y/w+1110)/1740)*height,w,(4250-14*zz)/17250/w];};
 const hits=[];
 for(const surface of [scene.body,scene.paper]){const positions=bodyPose?poseConnectedProxy(surface,bodyPose).positions:surface.positions;for(let i=0;i<surface.vertices;i+=3){
  const q=[0,1,2].map(k=>project(positions.slice((i+k)*3,(i+k)*3+3))),[a,b,c]=q;
  const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-12)continue;
  const u=((b[1]-c[1])*(pixel[0]-c[0])+(c[0]-b[0])*(pixel[1]-c[1]))/den,v=((c[1]-a[1])*(pixel[0]-c[0])+(a[0]-c[0])*(pixel[1]-c[1]))/den,weights=[u,v,1-u-v];if(weights.some(x=>x< -1e-9))continue;
  let sum=0,uv=[0,0],depth=0;
  for(let k=0;k<3;k++){const rw=(2300-surface.positions[(i+k)*3+2])/2300,w=weights[k]*rw/q[k][2];sum+=w;uv[0]+=surface.uv[(i+k)*2]*w*1152;uv[1]+=surface.uv[(i+k)*2+1]*w*1536;depth+=weights[k]*q[k][3];}
  hits.push({paper:surface.paper,triangle:i/3,source:uv.map(n=>n/sum),ndcDepth:depth});
 }
 }
 return hits.sort((a,b)=>a.ndcDepth-b.ndcDepth);
}

// This mirrors the observed fragment discard only. Returned hits still are not
// a final raster/occlusion proof and do not include the unregistered rear shell.
export function traceVisibleObservedSource(scene,pixel,{alphaAt,...options}={}){
 if(typeof alphaAt!=='function')throw Error('Source alpha sampler required');
 return traceObservedSource(scene,pixel,options).map(hit=>{
  const alpha=hit.paper?1:alphaAt(...hit.source);
  if(!Number.isFinite(alpha)||alpha<0||alpha>1)throw Error('Invalid sampled source alpha');
  return {...hit,sourceAlpha:alpha};
 }).filter(hit=>hit.sourceAlpha>=.005);
}
// GL_LINEAR + CLAMP_TO_EDGE in source-pixel coordinates; the shader samples red.
export function sampleObservedAlpha({pixels,width,height,channels=1},x,y){
 if(!pixels||![width,height,channels].every(Number.isInteger)||width<=0||height<=0||![1,4].includes(channels)||pixels.length!==width*height*channels||![x,y].every(Number.isFinite))throw Error('Invalid source matte');
 const sx=Math.max(0,Math.min(width-1,x-.5)),sy=Math.max(0,Math.min(height-1,y-.5)),a=Math.floor(sx),b=Math.floor(sy),tx=sx-a,ty=sy-b;
 const read=(xx,yy)=>pixels[(yy*width+xx)*channels]/255;
 const top=read(a,b)*(1-tx)+read(Math.min(a+1,width-1),b)*tx,bottom=read(a,Math.min(b+1,height-1))*(1-tx)+read(Math.min(a+1,width-1),Math.min(b+1,height-1))*tx;
 return top*(1-ty)+bottom*ty;
}

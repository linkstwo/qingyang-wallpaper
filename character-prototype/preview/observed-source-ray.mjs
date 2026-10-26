// Invert the structural-lab projection for a zero-body-pose diagnostic frame.
// Returns every geometric hit. The caller must apply the source matte alpha;
// a geometric hit alone is not a visible pixel or a seam-width measurement.
export function traceObservedSource(scene,pixel,{width=540,height=1176,yaw=0,pitch=0}={}){
 const c=Math.cos(yaw),s=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch);
 const project=p=>{const x=c*p[0]+s*p[2],z=-s*p[0]+c*p[2],y=cx*p[1]-sx*z,zz=sx*p[1]+cx*z,w=(2300-zz)/2300;return [(.14+(x/w+790)/1600)*width,(.04+(y/w+1110)/1740)*height,w,(4250-14*zz)/17250/w];};
 const hits=[];
 for(const surface of [scene.body,scene.paper])for(let i=0;i<surface.vertices;i+=3){
  const q=[0,1,2].map(k=>project(surface.positions.slice((i+k)*3,(i+k)*3+3))),[a,b,c]=q;
  const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-12)continue;
  const u=((b[1]-c[1])*(pixel[0]-c[0])+(c[0]-b[0])*(pixel[1]-c[1]))/den,v=((c[1]-a[1])*(pixel[0]-c[0])+(a[0]-c[0])*(pixel[1]-c[1]))/den,weights=[u,v,1-u-v];if(weights.some(x=>x< -1e-9))continue;
  let sum=0,uv=[0,0],depth=0;
  for(let k=0;k<3;k++){const rw=(2300-surface.positions[(i+k)*3+2])/2300,w=weights[k]*rw/q[k][2];sum+=w;uv[0]+=surface.uv[(i+k)*2]*w*1152;uv[1]+=surface.uv[(i+k)*2+1]*w*1536;depth+=weights[k]*q[k][3];}
  hits.push({paper:surface.paper,triangle:i/3,source:uv.map(n=>n/sum),ndcDepth:depth});
 }
 return hits.sort((a,b)=>a.ndcDepth-b.ndcDepth);
}

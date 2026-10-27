// Exact extrema of rotated-vector Z on a bounded yaw/pitch rectangle, with
// |pitch|<pi/2. Used for orientation/clip checks; not a self-intersection test.
const stationary=(angle,lo,hi)=>{const out=[];for(let k=-2;k<=2;k++){const a=angle+k*Math.PI;if(a>lo&&a<hi)out.push(a);}return out;};
export function cameraVectorExtrema(vector,{yaw,pitch}){
 if(!Array.isArray(vector)||vector.length!==3||!vector.every(Number.isFinite)||![yaw,pitch].every(r=>Array.isArray(r)&&r.length===2&&r.every(Number.isFinite)&&r[0]<=r[1])||yaw[0]<-Math.PI||yaw[1]>Math.PI||pitch[0]<=-Math.PI/2||pitch[1]>=Math.PI/2)throw Error('Invalid bounded camera domain');
 const [x,y,z]=vector,ys=[...yaw,...stationary(Math.atan2(-x,z),...yaw)];let min=Infinity,max=-Infinity,minAt,maxAt;
 for(const a of ys){const q=-x*Math.sin(a)+z*Math.cos(a),ps=[...pitch,...stationary(Math.atan2(y,q),...pitch)];for(const b of ps){const v=y*Math.sin(b)+q*Math.cos(b);if(v<min){min=v;minAt=[a,b];}if(v>max){max=v;maxAt=[a,b];}}}
 return {min,max,minAt,maxAt};
}
export function cameraTriangleFacing(points,{yaw,pitch,distance=2300,sourceArea2}){
 if(!Array.isArray(points)||points.length!==3||points.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))||!Number.isFinite(distance)||distance<=0||!Number.isFinite(sourceArea2)||sourceArea2===0)throw Error('Invalid facing triangle');
 const [a,b,c]=points,u=b.map((v,k)=>v-a[k]),v=c.map((w,k)=>w-a[k]),s=Math.sign(sourceArea2),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]].map(n=>n*s),k=normal.reduce((n,v,i)=>n+v*a[i],0)/distance,e=cameraVectorExtrema(normal,{yaw,pitch}),radius=Math.max(...points.map(p=>Math.hypot(...p))),minW=1-radius/distance,maxW=1+radius/distance;
 const minimumFacing=e.min-k,areaRatioLowerBound=minW>0&&minimumFacing>=0?minimumFacing/Math.abs(sourceArea2)/maxW**3:null;
 return {minimumFacing,maximumFacing:e.max-k,minimumAt:e.minAt,minW,areaRatioLowerBound,orientationPreserved:minW>0&&minimumFacing>0};
}

// Source-pixel depth proxy, manually fitted to the existing main view.
// Side/back references guide volume only: no registered multiview reconstruction.
export const structure = {
  version:3, source:[1086,1448], units:'source pixels; positive depth towards viewer',
  pivot:[620,1100], cameraDistance:2200, yawRadians:.14, pitchRadians:.07,
  headPlate:{anchor:[430,330],depth:116,rigidThroughY:395,neckEndsY:565},
  armSupport:{shoulder:[815,575],elbow:[815,1010],wrist:[350,1175],upperRadius:48,foreRadius:42,feather:36},
  references:['main-front-three-quarter.png','side-reference.png','back-reference.png'],
  limitation:'Bounded main-view depth proxy. Hidden surfaces and 360-degree viewing are not reconstructed.'
};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const bell=(x,y,cx,cy,rx,ry)=>Math.exp(-2*(((x-cx)/rx)**2+((y-cy)/ry)**2));
export function depthAt(x,y){
  // A broad head plate keeps the eyes/glasses together. Rounded torso/shoulder
  // and clothed chest volumes supply differential parallax below the neck.
  const head=1-smooth(350,510,y);
  const torso=85*bell(x,y,735,820,340,460);
  const shoulder=95*bell(x,y,815,565,180,220);
  const chest=105*bell(x,y,575,785,170,210);
  const arm=65*bell(x,y,800,985,160,300);
  const body=Math.pow(torso**4+shoulder**4+chest**4+arm**4,.25);
  return head*(110+12*bell(x,y,400,340,150,140))+(1-head)*body;
}
export function depthWeights(vertices){
  const values=new Float32Array(vertices.length/2);
  for(let i=0;i<values.length;i++)values[i]=depthAt(vertices[2*i],vertices[2*i+1]);
  return values;
}
function surfaceDelta(x,y,depth,viewX,viewY){
  const [px,py]=structure.pivot,dx=x-px,dy=y-py;
  const yaw=clamp(viewX,-1,1)*structure.yawRadians,pitch=clamp(viewY,-1,1)*structure.pitchRadians;
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch);
  const rx=cy*dx+sy*depth,rz=-sy*dx+cy*depth,ry=cx*dy-sx*rz,z=sx*dy+cx*rz;
  const d=structure.cameraDistance,k=d/(d-z),k0=d/(d-depth),free=smooth(0,45,depth);
  const tx=rx*k-dx*k0,ty=ry*k-dy*k0;
  return [tx/Math.sqrt(1+tx*tx/576)*free,ty/Math.sqrt(1+ty*ty/400)*free];
}

// Weak-perspective head plate: preserve facial distances, blend only through neck.
// Orientation is extracted from a projected vertical axis, never tuned per eye/vertex.
export const headWeight=(y)=>1-smooth(395,565,y);
function rotateVector(x,y,z,view){
  const yaw=clamp(view[0],-1,1)*structure.yawRadians,pitch=clamp(view[1],-1,1)*structure.pitchRadians;
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch);
  const rx=cy*x+sy*z,rz=-sy*x+cy*z;
  return [rx,cx*y-sx*rz,sx*y+cx*rz];
}
const perspective=p=>{const k=structure.cameraDistance/(structure.cameraDistance-p[2]);return [p[0]*k,p[1]*k];};
function headDelta(x,y,view){
  const {anchor:[hx,hy],depth}=structure.headPlate;
  const r=[hx-structure.pivot[0],hy-structure.pivot[1],depth];
  const a=perspective(rotateVector(...r,view)),b=perspective(rotateVector(r[0],r[1]+100,r[2],view));
  const angle=Math.atan2(-(b[0]-a[0]),b[1]-a[1]),c=Math.cos(angle),s=Math.sin(angle);
  const dx=x-hx,dy=y-hy,t=surfaceDelta(hx,hy,depth,...view);
  return [t[0]+c*dx-s*dy-dx,t[1]+s*dx+c*dy-dy];
}
function projectSurfacePoint(x,y,depth,viewX,viewY,pin=0){
  const h=headWeight(y),a=surfaceDelta(x,y,depth,viewX,viewY),b=headDelta(x,y,[viewX,viewY]);
  return [x+((1-h)*a[0]+h*b[0])*(1-pin),y+((1-h)*a[1]+h*b[1])*(1-pin)];
}

// CPU reference of the shared vertex shader, for geometry/GPU regression and tooling.
function deformSurfacePoint(x,y,depth,view,body,chest,hair,gain,pin=0,spatial=true){
  const q=spatial?projectSurfacePoint(x,y,depth,...view,pin):[x,y];
  const head=1-smooth(340,495,y),neck=bell(x,y,630,410,220,180),torso=bell(x,y,721,789,310,430);
  const tissue=bell(x,y,577,785,165,205),tipT=clamp((y-275)/205,0,1),strand=(x-(191+53*tipT))/36;
  const tip=Math.exp(-2*strand*strand)*smooth(285,465,y)*(1-smooth(480,515,y));
  const weight=.32+.68*torso+.22*neck+.3*head;
  const dx=(body[0]*weight+chest[0]*tissue+hair[0]*tip)*gain;
  const dy=(body[1]*weight+chest[1]*tissue+hair[1]*tip)*gain;
  let ix=dx,iy=dy;
  if(spatial){
    const yaw=clamp(view[0],-1,1)*structure.yawRadians,pitch=clamp(view[1],-1,1)*structure.pitchRadians;
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch);
    const rotate=(x,y,z)=>{const rx=cy*x+sy*z,rz=-sy*x+cy*z;return [rx,cx*y-sx*rz,sx*y+cx*rz];};
    const project=p=>{const k=structure.cameraDistance/(structure.cameraDistance-p[2]);return [p[0]*k,p[1]*k];};
    const r=[x-structure.pivot[0],y-structure.pivot[1],depth];
    const before=project(rotate(...r)),after=project(rotate(r[0]+dx,r[1]+dy,r[2]+(chest[2]||0)*tissue*gain));
    ix=after[0]-before[0];iy=after[1]-before[1];
  }
  const h=headWeight(y),{anchor:[hx,hy],depth:hd}=structure.headPlate;
  const hw=.32+.68*bell(hx,hy,721,789,310,430)+.22*bell(hx,hy,630,410,220,180)+.3*(1-smooth(340,495,hy));
  let hi=[body[0]*hw*gain,body[1]*hw*gain];
  if(spatial){
    const r=[hx-structure.pivot[0],hy-structure.pivot[1],hd];
    const a=perspective(rotateVector(...r,view)),b=perspective(rotateVector(r[0]+hi[0],r[1]+hi[1],r[2],view));
    hi=[b[0]-a[0],b[1]-a[1]];
  }
  let hairDelta=[hair[0]*tip*gain,hair[1]*tip*gain];
  if(spatial){
    const r=[x-structure.pivot[0],y-structure.pivot[1],depth];
    const a=perspective(rotateVector(...r,view)),b=perspective(rotateVector(r[0]+hairDelta[0],r[1]+hairDelta[1],r[2],view));
    hairDelta=[b[0]-a[0],b[1]-a[1]];
  }
  // Hair overlays the common skull motion, with a continuous neck blend.
  ix=ix*(1-h)+(hi[0]+hairDelta[0])*h;
  iy=iy*(1-h)+(hi[1]+hairDelta[1])*h;
  return [q[0]+ix*(1-pin),q[1]+iy*(1-pin)];
}

// Screen-space two-link support proxy. It preserves the projected bone lengths;
// it does not reconstruct a 3D skeleton or create hidden arm texture.
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const distance=(a,b)=>Math.hypot(...sub(a,b));
export function solveArm(shoulder){
  const {shoulder:s,elbow:e,wrist:w}=structure.armSupport;
  if(shoulder[0]===s[0]&&shoulder[1]===s[1])return {shoulder,elbow:e,wrist:w,reachable:true};
  const upper=distance(s,e),fore=distance(e,w),v=sub(w,shoulder),d=Math.hypot(...v);
  // Existing bounded projection stays reachable; clamp only guards roundoff/extremes.
  const reach=clamp(d,Math.abs(upper-fore)+1e-4,upper+fore-1e-4);
  const u=[v[0]/d,v[1]/d],along=(upper*upper-fore*fore+reach*reach)/(2*reach);
  const height=Math.sqrt(Math.max(0,upper*upper-along*along));
  const elbow=[shoulder[0]+u[0]*along+u[1]*height,shoulder[1]+u[1]*along-u[0]*height];
  return {shoulder,elbow,wrist:w,reachable:d>=Math.abs(upper-fore)&&d<=upper+fore};
}
function segmentWeight(p,a,b,r){
  const v=sub(b,a),d=sub(p,a),length2=v[0]*v[0]+v[1]*v[1];
  const t=clamp((v[0]*d[0]+v[1]*d[1])/length2,0,1);
  return 1-smooth(r,r+structure.armSupport.feather,Math.hypot(d[0]-t*v[0],d[1]-t*v[1]));
}
export function armWeights(x,y){
  const {shoulder:s,elbow:e,wrist:w,upperRadius,foreRadius}=structure.armSupport;
  const upper=segmentWeight([x,y],s,e,upperRadius),fore=segmentWeight([x,y],e,w,foreRadius);
  return [upper,fore,Math.max(upper,fore)];
}
function segmentTransform(p,a,b,qa,qb){
  if(a[0]===qa[0]&&a[1]===qa[1]&&b[0]===qb[0]&&b[1]===qb[1])return p;
  const v=sub(b,a),qv=sub(qb,qa),d=sub(p,a),den=Math.hypot(...v)*Math.hypot(...qv);
  const c=(v[0]*qv[0]+v[1]*qv[1])/den,s=(v[0]*qv[1]-v[1]*qv[0])/den;
  return [qa[0]+c*d[0]-s*d[1],qa[1]+s*d[0]+c*d[1]];
}
function supportPoint(x,y,raw,shoulder,pin){
  const [u,f,weight]=armWeights(x,y);
  let out=raw;
  if(weight>0){
    const {shoulder:s,elbow:e,wrist:w}=structure.armSupport,pose=solveArm(shoulder);
    const a=segmentTransform([x,y],s,e,pose.shoulder,pose.elbow),b=segmentTransform([x,y],e,w,pose.elbow,pose.wrist);
    const target=[a[0]+(b[0]-a[0])*f/(u+f),a[1]+(b[1]-a[1])*f/(u+f)];
    out=[raw[0]+(target[0]-raw[0])*weight,raw[1]+(target[1]-raw[1])*weight];
  }
  return [x+(out[0]-x)*(1-pin),y+(out[1]-y)*(1-pin)];
}
export function projectPoint(x,y,depth,vx,vy,pin=0){
  const [sx,sy]=structure.armSupport.shoulder;
  return supportPoint(x,y,projectSurfacePoint(x,y,depth,vx,vy),projectSurfacePoint(sx,sy,depthAt(sx,sy),vx,vy),pin);
}
export function deformPoint(x,y,depth,view,body,chest,hair,gain,pin=0,spatial=true){
  const [sx,sy]=structure.armSupport.shoulder;
  const shoulder=deformSurfacePoint(sx,sy,depthAt(sx,sy),view,body,[0,0,0],[0,0],gain,0,spatial);
  return supportPoint(x,y,deformSurfacePoint(x,y,depth,view,body,chest,hair,gain,0,spatial),shoulder,pin);
}

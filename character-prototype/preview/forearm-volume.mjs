// Research target only: direct use on the old flat source mesh folds at yaw0.08.
import {subject as S} from './subject.mjs';
import {depthAt,smooth} from './structure.mjs';
import {materialDepthAt,supportDepth} from './scene-model.mjs';
import {bodySupportDepthWeight} from './contact-rig.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// A bounded inferred front volume for the visible forearm, not measured depth.
// Keep the occluded proximal joint and neighbouring shirt/background unchanged.
// Contact support is applied AFTER this field by materialDepthAt.
export function forearmDepthAt(x,y,base){
 const a=S.arm.elbow,b=S.arm.wrist,dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy),0,1),distance=Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
 const weight=smooth(.15,.35,t)*(1-smooth(23,35,distance)),radius=38-11*t,front=125+55.6*t+Math.sqrt(Math.max(0,radius*radius-distance*distance));
 return base+(Math.max(base,front)-base)*weight;
}
export function inferredFrontDepthAt(x,y){const pin=bodySupportDepthWeight(x,y),base=depthAt(x,y);if(pin===1)return base;const raw=(base-pin*supportDepth(x,y))/(1-pin);return materialDepthAt(x,y,forearmDepthAt(x,y,raw));}

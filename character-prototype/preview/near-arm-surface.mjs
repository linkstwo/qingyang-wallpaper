// Inferred, continuous depth refinement on the existing main-image near arm.
// This supplies no hidden back texture and does not change source RGB or UV.
import {depthAt} from './structure.mjs';
import {materialDepthAt} from './scene-model.mjs';
export const nearArmDepthRegion={sourceSha256:'cc43f133c865b272f06cdff0d35086fae5b668100a70df09cc5cc1d0301eb411',outline:[[946,478],[986,448],[1020,454],[1055,492],[1073,580],[1082,710],[1090,875],[1105,1030],[1125,1170],[1152,1340],[1152,1536],[1105,1536],[1080,1370],[1060,1200],[1040,1050],[1015,890],[985,745],[961,660],[945,580]],sections:[[450,998,64,92],[650,1017,62,91],[850,1046,55,83],[1050,1081,48,72],[1350,1130,38,52]],depthInferred:true,confidence:0};
export function nearArmBlendWeight(x,y,collar=32){
 if(![x,y,collar].every(Number.isFinite)||collar<8||collar>96)throw Error('Invalid near-arm source sample');
 const poly=nearArmDepthRegion.outline;let inside=false,distance=Infinity;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[j],b=poly[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));distance=Math.min(distance,Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy));if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}
 const t=Math.min(1,distance/collar);return inside?t*t*(3-2*t):0;
}
export function nearArmDepthAt(x,y,base=depthAt){
 const blend=nearArmBlendWeight(x,y),old=base(x,y);if(!Number.isFinite(old))throw Error('Invalid base depth');if(!blend)return old;
 const ss=nearArmDepthRegion.sections;let j=0;while(j<ss.length-2&&y>ss[j+1][0])j++;const a=ss[j],b=ss[j+1],t=Math.max(0,Math.min(1,(y-a[0])/(b[0]-a[0]))),cx=a[1]+(b[1]-a[1])*t,r=a[2]+(b[2]-a[2])*t,z=a[3]+(b[3]-a[3])*t,radial=Math.max(-1,Math.min(1,(x-cx)/r)),target=materialDepthAt(x,y,z+r*.65*Math.max(0,1-radial*radial)**2);
 return old+(target-old)*blend;
}

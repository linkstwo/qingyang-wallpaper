import {subject} from './subject.mjs';
export const contacts=subject.contacts;

const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function polygonPin(x,y,outline,feather){
  let inside=false,distance=Infinity;
  for(let i=0,j=outline.length-1;i<outline.length;j=i++){
    const [ax,ay]=outline[j],[bx,by]=outline[i];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
    const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy;
    const t=length?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/length)):0;
    distance=Math.min(distance,Math.hypot(x-ax-t*dx,y-ay-t*dy));
  }
  // Hold a whole triangle around contact edges, then blend towards the free arm.
  return inside?1:1-smooth(28,28+feather,distance);
}
export function contactPin(x,y){
  let pin=smooth(...subject.fixedSeat,y);
  for(const region of contacts)pin=Math.max(pin,polygonPin(x,y,region.outline,region.feather));
  return pin;
}
export function contactWeights(vertices){
  const weights=new Float32Array(vertices.length/2);
  for(let i=0;i<weights.length;i++)weights[i]=contactPin(vertices[i*2],vertices[i*2+1]);
  return weights;
}

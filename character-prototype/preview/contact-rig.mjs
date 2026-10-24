// Hand-traced source-image contact regions, in unmodified 1086 x 1448 pixels.
// A shared scalar field is applied to the continuous mesh, so no RGB seams are cut.
export const contacts = [
  {name:'blueprint',feather:32,outline:[[0,831],[113,886],[173,940],[237,969],[295,1001],[332,1061],[377,1108],[366,1143],[0,1105]]},
  {name:'far-hand',feather:48,outline:[[121,881],[185,872],[251,882],[309,887],[324,924],[294,955],[244,972],[190,970],[141,949]]},
  {name:'near-hand',feather:60,outline:[[170,1162],[202,1138],[251,1130],[305,1125],[350,1135],[380,1175],[365,1210],[315,1238],[275,1257],[239,1260],[211,1246],[187,1220],[169,1205],[164,1184]]}
];

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
  let pin=smooth(1240,1360,y);
  for(const region of contacts)pin=Math.max(pin,polygonPin(x,y,region.outline,region.feather));
  return pin;
}
export function contactWeights(vertices){
  const weights=new Float32Array(vertices.length/2);
  for(let i=0;i<weights.length;i++)weights[i]=contactPin(vertices[i*2],vertices[i*2+1]);
  return weights;
}

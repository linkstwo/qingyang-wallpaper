const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function cropMapping(width,height,frame){
  const w=Math.max(1,width),h=Math.max(1,height),scale=w/1086*frame.zoom;
  return {scale,x:w*.5-frame.focusX*scale,y:h*.5-frame.focusY*scale,
    motionGain:Math.min(1.45,Math.max(w/1086,h/1448)/scale)};
}
export function cropPreset(width,height,mode=0){
  const w=Math.max(1,width),h=Math.max(1,height);
  const left=mode===0?120:0,right=mode===0?1038:1086,top=0,bottom=mode===0?1265:1448;
  const scale=mode===2?Math.max(w/1086,h/1448):Math.min(w*(mode===0?.88:.94)/(right-left),h*.9/(bottom-top));
  const x=w*.5-(left+right)*.5*scale,y=mode===2?(h-1448*scale)*.5:Math.min(h*.07,(h-(bottom-top)*scale)*.5);
  return {zoom:clamp(scale*1086/w,.45,3.5),focusX:(w*.5-x)/scale,focusY:(h*.5-y)/scale};
}

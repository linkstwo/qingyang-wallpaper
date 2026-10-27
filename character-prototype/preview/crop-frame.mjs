const WIDTH=1152,HEIGHT=1536;
export function minZoom(w,h){return Math.min(3.5,Math.max(.45,.6*Math.max(1,h)*WIDTH/(Math.max(1,w)*HEIGHT)));}
export function cropPreset(w,h,mode=0){w=Math.max(1,w);h=Math.max(1,h);let z=Math.max(minZoom(w,h),mode===1?1.10:mode===2?1.48:1.28);if(mode!==2)z=Math.max(minZoom(w,h),Math.min(z,h*.92*WIDTH/(w*1390)));return {zoom:z,focusX:725,focusY:755};}
export function cropMapping(w,h,f){w=Math.max(1,w);h=Math.max(1,h);const scale=w/WIDTH*f.zoom;return {scale,x:w*.5-f.focusX*scale,y:h*.5-f.focusY*scale,motionGain:Math.min(1.45,Math.max(w/WIDTH,h/HEIGHT)/scale)};}

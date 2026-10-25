// Framing experiment only: no production renderer or image bytes are changed.
// Regions are approximate human annotations from the two inspected source images.
export const SOURCE = Object.freeze({ width:1086, height:1448 });
export const STUDIES = [
  { id:'main', label:'原主图 · 保脸与背侧', image:'main-front-three-quarter.png',
    limitation:'原图只记录窄背侧，裁切不会补出被遮挡的背部。',
    regions:[
      {id:'head',label:'头部',box:[270,20,780,445]},
      {id:'face',label:'脸',box:[350,255,520,430]},
      {id:'shoulder',label:'近侧肩',box:[730,400,923,635]},
      {id:'back',label:'背侧窄条',box:[920,620,1015,1040]}
    ]},
  { id:'back', label:'背向参考 · 肩背同屏候选', image:'back-reference.png',
    limitation:'不同原图的固定观察方向；尚未对齐姿势或接入现有动态网格。',
    regions:[
      {id:'head',label:'头部',box:[280,15,786,405]},
      {id:'face',label:'脸侧',box:[610,230,730,420]},
      {id:'shoulder',label:'双肩',box:[137,397,670,570]},
      {id:'back',label:'上背',box:[210,440,570,726]},
      {id:'torso',label:'躯干下缘',box:[220,720,700,1000]}
    ]}
];
function finitePositive(v,name) {
  if(!Number.isFinite(v)||v<=0) throw new RangeError(name+' must be positive and finite');
}
function clamp(v,a,b) { return Math.max(a,Math.min(b,v)); }
export function unionRegions(regions) {
  if(!Array.isArray(regions)||!regions.length) throw new RangeError('At least one region is required');
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const region of regions) {
    const b=region.box;
    if(!Array.isArray(b)||b.length!==4||b.some(v=>!Number.isFinite(v))||
       b[0]<0||b[1]<0||b[2]>SOURCE.width||b[3]>SOURCE.height||b[2]<=b[0]||b[3]<=b[1])
      throw new RangeError('Invalid source-pixel region');
    x0=Math.min(x0,b[0]);y0=Math.min(y0,b[1]);
    x1=Math.max(x1,b[2]);y1=Math.max(y1,b[3]);
  }
  return [x0,y0,x1,y1];
}
export function baseline055(width,height,sizePercent=90,topPercent=10) {
  finitePositive(width,'width');finitePositive(height,'height');
  const scale=Math.min(Math.max(width/SOURCE.width,height/SOURCE.height),
    width/SOURCE.width*clamp(sizePercent,65,125)/100);
  const centerY=(height-SOURCE.height*scale)/2;
  return {scale,x:width/2-590*scale,
    y:centerY>=0?Math.min(height-SOURCE.height*scale,height*clamp(topPercent,0,20)/100):centerY};
}
export function fitRegions(width,height,regions,{reserveZoom=1.08,insetFraction=.0222222222,topFraction=.05}={}) {
  finitePositive(width,'width');finitePositive(height,'height');
  if(!Number.isFinite(reserveZoom)||reserveZoom<1)throw new RangeError('reserveZoom must be >= 1');
  if(!Number.isFinite(insetFraction)||insetFraction<0||insetFraction>=.5)throw new RangeError('Invalid inset');
  if(!Number.isFinite(topFraction)||topFraction<0||topFraction>1)throw new RangeError('Invalid topFraction');
  const bounds=unionRegions(regions),[x0,y0,x1,y1]=bounds;
  const inset=width*insetFraction,availableW=width-2*inset,availableH=height-2*inset;
  if(availableH<=0)throw new RangeError('No safe height remains');
  const cover=Math.max(width/SOURCE.width,height/SOURCE.height);
  const scale=Math.min(cover,availableW/(reserveZoom*(x1-x0)),availableH/(reserveZoom*(y1-y0)));
  const cx=width/2,cy=height/2;
  // Inverse of an assumed centred compositor zoom; this is a stress model,
  // not a claim about any particular OEM's real scaling behaviour.
  const minX=cx+(inset-cx)/reserveZoom-x0*scale;
  const maxX=cx+(width-inset-cx)/reserveZoom-x1*scale;
  const minY=cy+(inset-cy)/reserveZoom-y0*scale;
  const maxY=cy+(height-inset-cy)/reserveZoom-y1*scale;
  return {scale,x:clamp(cx-(x0+x1)/2*scale,minX,maxX),
    y:clamp(height*topFraction,minY,maxY),bounds,inset,reserveZoom};
}
export function projectBox(box,frame,width,height,zoom=1) {
  finitePositive(zoom,'zoom');
  return [(box[0]*frame.scale+frame.x-width/2)*zoom+width/2,
    (box[1]*frame.scale+frame.y-height/2)*zoom+height/2,
    (box[2]*frame.scale+frame.x-width/2)*zoom+width/2,
    (box[3]*frame.scale+frame.y-height/2)*zoom+height/2];
}
export function regionContained(box,frame,width,height,zoom=1,margin=0) {
  const b=projectBox(box,frame,width,height,zoom),e=1e-6;
  return b[0]>=margin-e&&b[1]>=margin-e&&b[2]<=width-margin+e&&b[3]<=height-margin+e;
}
export function projectedHeightFraction(frame,height) {
  return SOURCE.height*frame.scale/height;
}

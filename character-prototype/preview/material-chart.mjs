// Provisional source chart to inspect back-material correspondence. No production use.
// Image-space observations are real pixels; their association with inferred3D is unverified.
import {sceneModel,projectWorld} from './scene-model.mjs';
export const backChart={version:1,source:'references/originals/back-reference.png',sourceSize:[1086,1448],confidence:0,status:'provisional_manual_chart',
 rows:[{y:520,left:[143,480],right:[645,480]},{y:650,left:[160,640],right:[670,640]},{y:790,left:[200,780],right:[680,780]},{y:945,left:[244,900],right:[692,900]},{y:1100,left:[266,1002],right:[742,1002]}],
 limitations:['Section-to-image rails are manually inferred, not camera-calibrated correspondences.','Source arms/neck pose differ from reading-v2.','Only torso-back chart is explored; head, neck, arms and front never use this source.','No new surface has production texture confidence.']};
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function sectionAt(y){const s=sceneModel.sections;let i=0;while(i<s.length-2&&y>s[i+1].y)i++;const a=s[i],b=s[i+1],t=clamp((y-a.y)/(b.y-a.y),0,1);return Object.fromEntries(['cx','rx','cz','rz'].map(k=>[k,lerp(a[k],b[k],t)]));}
export function backChartAt(position,region){
 const [x,y]=projectWorld(position),rows=backChart.rows;
 if(region!==1||y<rows[0].y||y>rows.at(-1).y)return {uv:[0,0],candidate:0,confidence:0};
 const s=sectionAt(y),u=(x-s.cx)/s.rx;
 // Stay on the rear half and keep a margin from the unknown shoulder/side seam.
 if(Math.abs(u)>.9||position[2]>=s.cz-.18*s.rz)return {uv:[0,0],candidate:0,confidence:0};
 let i=0;while(i<rows.length-2&&y>rows[i+1].y)i++;const a=rows[i],b=rows[i+1],t=(y-a.y)/(b.y-a.y),across=(u+1)/2;
 const q=[0,1].map(k=>lerp(lerp(a.left[k],b.left[k],t),lerp(a.right[k],b.right[k],t),across));
 return {uv:q.map((v,k)=>v/backChart.sourceSize[k]),candidate:1,confidence:0};
}
export function buildBackChart(model){const uv=[],candidate=[],confidence=[];for(let i=0;i<model.positions.length/3;i++){const q=backChartAt(model.positions.slice(i*3,i*3+3),model.region[i]);uv.push(...q.uv);candidate.push(q.candidate);confidence.push(q.confidence);}return {uv,candidate,confidence,chart:backChart};}

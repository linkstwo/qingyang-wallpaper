// Provisional source chart to inspect back-material correspondence. No production use.
// Image-space observations are real pixels; their association with inferred3D is unverified.
import {sceneModel,projectWorld} from './scene-model.mjs';
export const backChart={version:1,source:'references/originals/back-reference.png',sourceSize:[1086,1448],confidence:0,status:'provisional_manual_chart',sourceHorizontal:'rear view reverses main-world +X',
 rows:[{y:520,left:[218,480],right:[486,480]},{y:650,left:[228,640],right:[502,640]},{y:790,left:[259,780],right:[544,780]},{y:945,left:[279,900],right:[591,900]},{y:1100,left:[286,1002],right:[621,1002]}],
 limitations:['Section-to-image rails are manually inferred, not camera-calibrated correspondences.','Source arms/neck pose differ from reading-v2.','Only torso-back chart is explored; head, neck, arms and front never use this source.','No new surface has production texture confidence.']};
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function sectionAt(y){const s=sceneModel.sections;let i=0;while(i<s.length-2&&y>s[i+1].y)i++;const a=s[i],b=s[i+1],t=clamp((y-a.y)/(b.y-a.y),0,1);return Object.fromEntries(['cx','rx','cz','rz'].map(k=>[k,lerp(a[k],b[k],t)]));}
export function backChartAt(position,region,chart=backChart){
 const [x,y]=projectWorld(position),rows=chart.rows;
 if(region!==1||y<rows[0].y||y>rows.at(-1).y)return {uv:[0,0],candidate:0,confidence:0};
 const s=sectionAt(y),u=(x-s.cx)/s.rx;
 // Stay on the rear half and keep a margin from the unknown shoulder/side seam.
 if(Math.abs(u)>.9||position[2]>=s.cz-.18*s.rz)return {uv:[0,0],candidate:0,confidence:0};
 let i=0;while(i<rows.length-2&&y>rows[i+1].y)i++;const a=rows[i],b=rows[i+1],t=(y-a.y)/(b.y-a.y),across=(1-u)/2;
 const q=[0,1].map(k=>lerp(lerp(a.left[k],b.left[k],t),lerp(a.right[k],b.right[k],t),across));
 return {uv:q.map((v,k)=>v/chart.sourceSize[k]),candidate:1,confidence:0};
}
export function buildBackChart(model,chart=backChart){const uv=[],candidate=[],confidence=[];for(let i=0;i<model.positions.length/3;i++){const q=backChartAt(model.positions.slice(i*3,i*3+3),model.region[i],chart);uv.push(...q.uv);candidate.push(q.candidate);confidence.push(q.confidence);}return {uv,candidate,confidence,chart};}
export function validateBackChart(chart){
 if(!chart||chart.version!==1||chart.source!==backChart.source||chart.confidence!==0||chart.status!=='provisional_manual_chart'||chart.sourceHorizontal!==backChart.sourceHorizontal||JSON.stringify(chart.sourceSize)!==JSON.stringify(backChart.sourceSize)||!Array.isArray(chart.rows)||chart.rows.length!==backChart.rows.length)return false;
 return chart.rows.every((r,i)=>r.y===backChart.rows[i].y&&['left','right'].every(k=>Array.isArray(r[k])&&r[k].length===2&&r[k].every((v,j)=>Number.isFinite(v)&&v>=0&&v<chart.sourceSize[j])&&(!i||r[k][1]>chart.rows[i-1][k][1]))&&r.left[0]<r.right[0]);
}

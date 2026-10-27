// Provisional source chart to inspect back-material correspondence. No production use.
// Image-space observations are real pixels; their association with inferred3D is unverified.
import {sceneModel,projectWorld} from './scene-model.mjs';
import {monotoneCurve} from './monotone-curve.mjs';
export const backChart={version:2,source:'references/originals/back-reference.png',sourceSize:[1086,1448],confidence:0,status:'provisional_manual_chart',sourceHorizontal:'rear view reverses main-world +X',interpolation:'monotone_cubic',
 sourceRegions:[{name:'nape-to-shoulder',y:[415,520],material:'observed nape skin/hair boundary',association:'inferred, not independently calibrated'},{name:'upper-back',y:[520,790],material:'observed skin/cloth',association:'inferred, not independently calibrated'},{name:'lower-back',y:[790,1100],material:'observed cloth',association:'inferred, not independently calibrated'}],
 rows:[{y:415,left:[330,345],right:[430,345]},{y:465,left:[285,390],right:[478,390]},{y:520,left:[218,480],right:[486,480]},{y:650,left:[228,640],right:[502,640]},{y:790,left:[259,780],right:[544,780]},{y:945,left:[279,900],right:[591,900]},{y:1100,left:[286,1002],right:[621,1002]}],
 limitations:['Section-to-image rails are manually observed in2D, but their association to the3D proxy is inferred, not camera-calibrated.','Source arms/neck pose differ from reading-v2.','Only rear nape and torso chart is explored; head, arms and front never use this source.','No new surface has production texture confidence.']};
const lerp=(a,b,t)=>a+(b-a)*t,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function sectionAt(y){const s=sceneModel.sections;let i=0;while(i<s.length-2&&y>s[i+1].y)i++;const a=s[i],b=s[i+1],t=clamp((y-a.y)/(b.y-a.y),0,1);return Object.fromEntries(['cx','rx','cz','rz'].map(k=>[k,lerp(a[k],b[k],t)]));}
function railSampler(chart){const xs=chart.rows.map(r=>r.y);return ['left','right'].map(side=>[0,1].map(k=>monotoneCurve(xs,chart.rows.map(r=>r[side][k]))));}
export function sampleBackRails(y,chart=backChart){const curves=railSampler(chart);return curves.map(rail=>rail.map(f=>f(y)));}
export function backChartAt(position,region,chart=backChart,curves=railSampler(chart)){
 const [x,y]=projectWorld(position),rows=chart.rows;
 if(region!==1||y<rows[0].y||y>rows.at(-1).y)return {uv:[0,0],candidate:0,confidence:0};
 const s=sectionAt(y),u=(x-s.cx)/s.rx;
 // Stay on the rear half and keep a margin from the unknown shoulder/side seam.
 if(Math.abs(u)>.9||position[2]>=s.cz-.18*s.rz)return {uv:[0,0],candidate:0,confidence:0};
 const across=(1-u)/2,q=[0,1].map(k=>lerp(curves[0][k](y),curves[1][k](y),across));
 return {uv:q.map((v,k)=>v/chart.sourceSize[k]),candidate:1,confidence:0};
}
export function buildBackChart(model,chart=backChart){const uv=[],candidate=[],confidence=[],curves=railSampler(chart);for(let i=0;i<model.positions.length/3;i++){const q=backChartAt(model.positions.slice(i*3,i*3+3),model.region[i],chart,curves);uv.push(...q.uv);candidate.push(q.candidate);confidence.push(q.confidence);}return {uv,candidate,confidence,chart};}
export function validateBackChart(chart){
 if(!chart||chart.version!==2||chart.source!==backChart.source||chart.confidence!==0||chart.status!=='provisional_manual_chart'||chart.interpolation!==backChart.interpolation||chart.sourceHorizontal!==backChart.sourceHorizontal||JSON.stringify(chart.sourceSize)!==JSON.stringify(backChart.sourceSize)||!Array.isArray(chart.rows)||chart.rows.length!==backChart.rows.length)return false;
 if(!chart.rows.every((r,i)=>r.y===backChart.rows[i].y&&['left','right'].every(k=>Array.isArray(r[k])&&r[k].length===2&&r[k].every((v,j)=>Number.isFinite(v)&&v>=0&&v<chart.sourceSize[j])&&(!i||r[k][1]>chart.rows[i-1][k][1]))&&r.right[0]-r.left[0]>=2))return false;
 const curves=railSampler(chart);for(let i=0;i<chart.rows.length-1;i++)for(let k=1;k<16;k++){const y=lerp(chart.rows[i].y,chart.rows[i+1].y,k/16),delta=1e-3,L=curves[0].map(f=>f(y)),R=curves[1].map(f=>f(y)),d=R.map((v,j)=>v-L[j]),dL=curves[0].map(f=>(f(y+delta)-f(y-delta))/(2*delta)),dR=curves[1].map(f=>(f(y+delta)-f(y-delta))/(2*delta));for(const u of [0,.5,1]){const v=dL.map((x,j)=>lerp(x,dR[j],u));if(d[0]*v[1]-d[1]*v[0]<=1e-6)return false;}}
 return true;
}

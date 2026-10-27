// Run: node tests/framing-study-regression.mjs
import {STUDIES,baseline055,fitRegions,regionContained,projectedHeightFraction} from '../character-prototype/preview/framing-study.mjs';
let checks=0,cases=0;
const assert=(condition,message)=>{checks++;if(!condition)throw new Error(message);};
const sizes=[[1080,2400],[1260,2800],[1440,3200],[1080,2340],[1080,2520],[1080,1920],[1440,2560],[360,800],[320,568]];
for(const [w,h]of sizes)for(const study of STUDIES)for(const zoom of [1,1.02,1.04,1.08]){
 const f=fitRegions(w,h,study.regions);cases++;
 for(const r of study.regions)assert(regionContained(r.box,f,w,h,zoom,f.inset),'Region clips: '+study.id+' '+w+'x'+h+' zoom '+zoom);
 assert(f.scale<=Math.max(w/1086,h/1448)+1e-9,'Do not magnify past cover unnecessarily');
}
const old=baseline055(1080,2400);
assert(Math.abs(old.scale-0.8950276243093923)<1e-9,'Production baseline scale');
assert(Math.abs(projectedHeightFraction(old,2400)-.54)<1e-9,'Production baseline image projection is 54%');
for(const args of [[0,2400,STUDIES[0].regions],[1080,NaN,STUDIES[0].regions],[1080,2400,[]],[1080,2400,[{box:[0,0,2000,100]}]],[1080,2400,STUDIES[0].regions,{reserveZoom:.9}]]){
 let rejected=false;try{fitRegions(...args);}catch{rejected=true;}assert(rejected,'Invalid input must fail');
}
console.log('PASS '+checks+' checks in '+cases+' cases; manual-ROI geometry only, not visual/phone acceptance');

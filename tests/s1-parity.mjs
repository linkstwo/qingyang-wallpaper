import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Response} from '../character-prototype/preview/response.mjs';
import {cropPreset,cropMapping} from '../character-prototype/preview/crop-frame.mjs';
for(const lively of [false,true]){
 const file=new URL(lively?'../validation/motion-0.5.7.csv':'../validation/motion-0.5.6.csv',import.meta.url);
 const rows=fs.readFileSync(file,'utf8').trim().split(/\r?\n/).map(line=>line.split(',').map(Number));
 const model=new Response(true,lively);let error=0;
 for(let n=0;n<rows.length;n++){
  const t=n/120;model.step(1/120,{alphaY:t<2?35*Math.sin(t*Math.PI*6):0,alphaX:t<2?20*Math.sin(t*Math.PI*4.4):0});
  const v=model.values;
  for(const [a,b] of [[v[0],rows[n][1]],[v[2],rows[n][2]],[v[3],rows[n][3]],[v[4],rows[n][4]]])error=Math.max(error,Math.abs(a-b));
 }
 assert.ok(error<.0002,`full Java/JS trajectory parity ${lively}: ${error}`);
 console.log(`PASS ${lively?'coupled':'0.5.6'} response parity, max error ${error}`);
}
for(const [w,h] of [[1080,2400],[1260,2800],[1080,1920]]){
 const frame=cropMapping(w,h,cropPreset(w,h,0));
 for(const [x,y] of [[940,490],[350,1005],[985,1090]])assert.ok(frame.x+x*frame.scale>=0&&frame.x+x*frame.scale<=w&&frame.y+y*frame.scale>=0&&frame.y+y*frame.scale<=h);
}
console.log('PASS live crop presets keep shoulder, forearm and waist in frame');

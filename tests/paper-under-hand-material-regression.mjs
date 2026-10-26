import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildObservedScene} from '../character-prototype/preview/observed-scene.mjs';
import {paperUnderHandBackgroundOutline,paperSourcePartition} from '../character-prototype/preview/paper-source-partition.mjs';
import {makeMesh} from '../character-prototype/preview/rig.mjs';
import {subtractPolygon} from '../character-prototype/preview/layered-mesh.mjs';
import {traceVisibleObservedSource,sampleObservedAlpha} from '../character-prototype/preview/observed-source-ray.mjs';
const matte={pixels:fs.readFileSync(process.env.PAPER_MATTE_BYTES),width:1152,height:1536};
const area=s=>{let a=0;for(let i=0;i<s.length;i+=6)a+=Math.abs((s[i+2]-s[i])*(s[i+5]-s[i+1])-(s[i+3]-s[i+1])*(s[i+4]-s[i]))/2;return a;};
const bodySource=s=>s.uv.map((v,i)=>v*[1152,1536][i%2]);
const expectedArea=area(subtractPolygon(makeMesh(paperUnderHandBackgroundOutline),paperSourcePartition.outline));
const pixel=([x,y])=>[(.14+x/1600)*540,(.04+y/1740)*1176];
const view={alphaAt:(x,y)=>sampleObservedAlpha(matte,x,y)},rows=[];
for(const forearmVolume of [false,true]){
 const opts={forearmVolume,paperPartition:true,paperLapContact:true,paperRightClothContact:true,paperBackgroundTrim:true,lapContactWidth:96,seatSupport:true};
 const old=buildObservedScene(opts),candidate=buildObservedScene({...opts,paperUnderHandBackgroundTrim:true});
 const removedArea=area(bodySource(old.body))-area(bodySource(candidate.body));
 assert(Math.abs(removedArea-expectedArea)<.06,'remove only the declared observed background, not paper/skin/cloth');
 assert(Math.abs(area(bodySource(old.paper))-area(bodySource(candidate.paper)))<.05,'paper source area preserved');
 for(const source of [[470,1040],[500,1040],[550,1020]]){
  const before=traceVisibleObservedSource(old,pixel(source),view),after=traceVisibleObservedSource(candidate,pixel(source),view);
  assert(before.length&&!before[0].paper,'negative control reproduces old foreground background binding');
  assert.equal(after.length,0,'observed background must not remain on the body');
  rows.push({forearmVolume,source,before:before[0],afterHits:after.length});
 }
 for(const source of [[450,980],[550,1150],[380,1080]]){
  const before=traceVisibleObservedSource(old,pixel(source),view),after=traceVisibleObservedSource(candidate,pixel(source),view);
  assert(before.length&&after.length,'hand, cloth and paper retained');
  assert.equal(after[0].paper,before[0].paper);
  assert(Math.hypot(...after[0].source.map((v,k)=>v-source[k]))<1e-7,'original source UV preserved');
 }
 const gated=buildObservedScene({...opts,paperPartition:false,paperUnderHandBackgroundTrim:true}),plain=buildObservedScene({...opts,paperPartition:false});for(const key of ['body','paper'])assert.deepEqual(gated[key],plain[key],'gated off outside source partition experiment');
}
fs.writeFileSync(new URL('../validation/f14-under-hand-material.json',import.meta.url),JSON.stringify({rows,expectedArea,defaultEnabled:false,sourceClassification:'manual conservative visible-background polygon',hiddenTextureAdded:false,wholeT03Accepted:false,phoneTested:false},null,2)+'\n');
console.log(JSON.stringify({passed:true,removedSourceArea:expectedArea,negativeControls:rows.length}));

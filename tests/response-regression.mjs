import assert from 'node:assert/strict';
import {Response,framing,hairWeight} from '../character-prototype/preview/response.mjs';
const java=JSON.parse(process.argv[2]);
for(const enhanced of [false,true]){
  const model=new Response(enhanced);let chest=0,hair=0,hy=0;
  for(let n=0;n<7*120;n++){
    const t=n/120;model.step(1/120,{alphaY:t<2?35*Math.sin(t*Math.PI*6):0,alphaX:t<2?20*Math.sin(t*Math.PI*4.4):0});
    chest=Math.max(chest,Math.abs(model.values[2]));hair=Math.max(hair,Math.abs(model.values[4]));hy=Math.max(hy,Math.abs(model.values[5]));
  }
  assert.ok(Math.abs(chest-java[enhanced?'enhancedChestPeak':'legacyChestPeak'])<1e-4,'JS and production Java chest trajectory');
  assert.ok(Math.abs(hair-java[enhanced?'enhancedHairPeak':'legacyHairPeak'])<1e-4,'JS and production Java hair trajectory');
  if(enhanced)assert.ok(Math.abs(hy-java.hairYPeak)<1e-4,'independent vertical hair trajectory');
}
const depthModel=new Response();let depthPeak=0;
for(let n=0;n<120*6;n++){
 const t=n/120;depthModel.step(1/120,{linearZ:t<2?4*Math.sin(t*Math.PI*4):0});depthPeak=Math.max(depthPeak,Math.abs(depthModel.values[6]));
}
assert.ok(Math.abs(depthPeak-java.depthPeak)<1e-4,'Java/JS depth spring trajectory');
assert.ok(Math.abs(depthModel.values[6])<.001,'depth spring must settle');
assert.equal(hairWeight(200,260),0,'hair root fixed');
assert.ok(hairWeight(240,475)>.8,'free strand tip');
assert.ok(hairWeight(392,333)<1e-9,'face and glasses outside hair response');
assert.ok(hairWeight(630,410)<1e-12,'neck is not a loose hair strand');
const frame=framing(1260,2800,true);assert.ok(Math.abs((1260-frame.x)/frame.scale-java.newVisibleRight)<.01);
console.log('PASS: Java/JS response parity, framing coverage and root/face/tip weight checks');

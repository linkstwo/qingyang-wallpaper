import fs from 'node:fs';import assert from 'node:assert/strict';
import {buildObservedScene} from '../character-prototype/preview/observed-scene.mjs';
import {buildUnderHandBackground} from '../character-prototype/preview/observed-background.mjs';
import {traceVisibleObservedSource} from '../character-prototype/preview/observed-source-ray.mjs';
import {projectWorld} from '../character-prototype/preview/scene-model.mjs';
import {poseConnectedProxy} from '../character-prototype/preview/structural-pose.mjs';
const background=buildUnderHandBackground();assert(background.vertices>100);assert.equal(background.depthInferred,true);assert.equal(background.hiddenTextureAdded,false);
for(let i=0;i<background.vertices;i++){const q=projectWorld(background.positions.slice(i*3,i*3+3));assert(Math.hypot(q[0]-background.uv[i*2]*1152,q[1]-background.uv[i*2+1]*1536)<1e-8);assert.equal(background.positions[i*3+2],-180);}
assert.deepEqual(poseConnectedProxy(background,{yaw:.059,pitch:-.04,roll:.034}).positions,background.positions,'workshop does not follow body bones');
const scene=buildObservedScene({paperPartition:true,paperUnderHandBackgroundTrim:true,paperUnderHandBackgroundPlane:true}),pixel=[(.14+500/1600)*540,(.04+1040/1740)*1176];
const hit=traceVisibleObservedSource(scene,pixel,{alphaAt:()=>0});assert(hit.length&&hit[0].background&&!hit[0].paper);assert(Math.hypot(hit[0].source[0]-500,hit[0].source[1]-1040)<1e-8,'observed background UV retained');
assert.equal(traceVisibleObservedSource({...scene,background:null},pixel,{alphaAt:()=>0}).length,0,'negative: body matte cannot supply this background as skin');
const p=[(500-790)*(2300+180)/2300,(1040-1110)*(2300+180)/2300,-180],yaw=Math.PI/9,c=Math.cos(yaw),sn=Math.sin(yaw),x=c*p[0]+sn*p[2],z=-sn*p[0]+c*p[2],w=(2300-z)/2300,occludedPixel=[(.14+(x/w+790)/1600)*540,(.04+(p[1]/w+1110)/1740)*1176],ordered=traceVisibleObservedSource(scene,occludedPixel,{yaw,alphaAt:()=>1});assert(ordered.some(h=>h.background)&&ordered[0].paper,'paper must occlude the farther observed background in a real shared ray');
assert.equal(buildObservedScene({paperUnderHandBackgroundPlane:true}).background,null,'research opt-in requires actual source partition and trim');assert.throws(()=>buildUnderHandBackground({depth:NaN}));assert.throws(()=>buildUnderHandBackground({depth:200}));
fs.writeFileSync('validation/f14-observed-background.json',JSON.stringify({vertices:background.vertices,zeroPoseExact:true,bodyPoseIndependent:true,sourceUvRetained:true,inferredDepth:-180,hiddenTextureAdded:false,defaultEnabled:false,wholeT03Accepted:false,phoneTested:false},null,2)+'\n');console.log('Observed background: source projection, independent pose, explicit material identity, gating and invalid-depth controls passed');

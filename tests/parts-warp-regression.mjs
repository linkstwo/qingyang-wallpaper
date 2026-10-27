import assert from 'node:assert/strict';
import {similarityPoint,makeHandles,buildWarp,validateDraft} from '../character-prototype/preview/parts-warp.mjs';
let checks=0;const close=(a,b,eps=1e-8)=>{assert.ok(Math.hypot(...a.map((v,i)=>v-b[i]))<eps,`${a} != ${b}`);checks++;};
const p=[[0,0],[100,0],[0,80],[100,80],[42,37]],queries=[[0,0],[16,29],[66.2,47.1],[100,80]];
for(const [name,transform] of [['identity',p=>p],['translation',p=>[p[0]+9.25,p[1]-6.5]],['similarity',p=>[1.2*p[0]-.4*p[1]+8,.4*p[0]+1.2*p[1]-9]]]){const handles=p.map((source,i)=>({id:String(i),source,target:transform(source)}));for(const q of queries)close(similarityPoint(q,handles),transform(q));}
const roi=[100,100,500,700],handles=makeHandles(roi),identity={sha:'a'.repeat(64),source:'reference.png',size:[1000,1200]};
const neutral=buildWarp(roi,handles);assert.ok(neutral.identity&&neutral.valid);checks++;for(let i=0;i<neutral.source.length;i++)close(neutral.target[i],neutral.source[i]);
handles[1].target[0]+=30;const moved=buildWarp(roi,handles);assert.ok(moved.valid&&!moved.identity);checks++;
for(let i=0;i<moved.source.length;i++){const p=moved.source[i];if(p[0]===roi[0]||p[0]===roi[0]+roi[2]||p[1]===roi[1]||p[1]===roi[1]+roi[3])close(moved.target[i],p);}
const zero=buildWarp(roi,handles,{gain:0});for(let i=0;i<zero.source.length;i++)close(zero.target[i],zero.source[i]);
const draft={version:1,method:'mls-similarity',part:'arm',gain:1,source:identity.source,sourceSha256:identity.sha,size:identity.size,confidence:0,roi,handles};assert.equal(validateDraft(draft,identity),true);checks++;
for(const bad of [{...draft,sourceSha256:'b'.repeat(64)},{...draft,confidence:1},{...draft,roi:[-1,0,100,100]},{...draft,handles:[handles[0],handles[0],handles[1]]}]){assert.throws(()=>validateDraft(bad,identity));checks++;}
const folded=structuredClone(handles);folded[1].target=[roi[0]+roi[2],roi[1]+roi[3]];assert.ok(!buildWarp(roi,folded).valid);checks++;
console.log(JSON.stringify({status:'passed',checks,triangles:moved.indices.length,minAreaRatio:moved.minAreaRatio,phoneTested:false}));

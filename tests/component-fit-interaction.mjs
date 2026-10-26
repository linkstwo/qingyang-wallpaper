// DOM contract fixture: executes actual UI handlers. Not a browser/GPU claim.
import fs from 'node:fs';import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),elements=new Map(),downloads=[],nativeFetch=globalThis.fetch;
const gl=new Proxy({NO_ERROR:0,COMPILE_STATUS:1,LINK_STATUS:2,getShaderParameter:()=>true,getProgramParameter:()=>true,getError:()=>0,getAttribLocation:()=>0,getUniformLocation:()=>({}),createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),createTexture:()=>({})},{get:(o,k)=>k in o?o[k]:typeof k==='string'&&k===k.toUpperCase()?1:()=>{}});
class Element{constructor(id){this.id=id;this.value=id==='gain'?'55':'';this.listeners={};this.dataset={};this.classList={toggle(){}};this.width=540;this.height=590;this.checked=false;}addEventListener(n,f){this.listeners[n]=f;}setPointerCapture(){}getBoundingClientRect(){return {left:0,top:0,width:540,height:590};}getContext(kind){return kind==='webgl'?gl:new Proxy({},{get:()=>()=>{}});}click(){if(this.href)downloads.push({url:this.href,name:this.download});}emit(name,data={}){this.listeners[name]?.({pointerId:1,...data});}}
globalThis.document={getElementById:id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);},createElement:tag=>new Element(tag),body:new Element('body')};
globalThis.fetch=async url=>{if(String(url).startsWith('blob:'))return nativeFetch(url);const path=new URL(String(url),new URL('character-prototype/preview/',root));try{const bytes=fs.readFileSync(path);if(process.env.CORRUPT_COMPONENT==='1'&&String(path).includes('-cutout.png'))bytes[bytes.length-20]^=1;return new Response(bytes);}catch{return new Response('',{status:404});}};
globalThis.Image=class{async decode(){const bytes=new Uint8Array(await(await nativeFetch(this.src)).arrayBuffer());const v=new DataView(bytes.buffer);this.width=v.getUint32(16);this.height=v.getUint32(20);}};
await import('../character-prototype/preview/component-fit.mjs');
for(let i=0;i<100&&document.body.dataset.ready!=='true'&&document.body.dataset.ready!=='error';i++)await new Promise(r=>setTimeout(r,2));
if(process.env.CORRUPT_COMPONENT==='1'){assert.equal(document.body.dataset.ready,'error');assert.match(elements.get('status').textContent,/身份校验失败/);console.log('Actual UI rejects tampered crop before readiness');process.exit(0);}
assert.equal(document.body.dataset.ready,'true',elements.get('status').textContent);
const after=elements.get('after'),gain=elements.get('gain');
async function exported(){elements.get('export').onclick();const item=downloads.at(-1);assert.equal(item.name,'qingyang-shared-components.json');return (await nativeFetch(item.url)).json();}
const rest=await exported();assert.deepEqual(rest.sourcePositions,rest.targetSourcePositions);
const pixel=([x,y])=>({clientX:(x-640)/330*540,clientY:(y-295)/360*590});
after.emit('pointerdown',pixel([800,450]));after.emit('pointermove',pixel([806,453]));after.emit('pointerup');
const moved=await exported();assert.notDeepEqual(moved.targetSourcePositions,rest.sourcePositions);assert.deepEqual(moved.sourcePositions,rest.sourcePositions);assert.deepEqual(moved.cornerUv,rest.cornerUv);assert.equal(moved.registeredToMain,false);assert(moved.deformation.selfIntersectionChecked);
gain.value='0';gain.oninput();const zero=await exported();assert.deepEqual(zero.sourcePositions,zero.targetSourcePositions);after.emit('pointerdown',pixel([800,450]));after.emit('pointermove',pixel([900,550]));after.emit('pointerup');assert.deepEqual((await exported()).deformation.handles,zero.deformation.handles,'zero gain disables ambiguous dragging');
gain.value='55';gain.oninput();elements.get('reset').onclick();assert.deepEqual((await exported()).sourcePositions,(await exported()).targetSourcePositions);
elements.get('source').value='nearDown';await elements.get('source').onchange();assert.equal(document.body.dataset.ready,'true');const near=await exported();assert.equal(near.sourceSha256,'56a79d4fa430d24396d3413c2f444e10e224d2e196fae9b87c72f9f1b5ddfeea');assert.deepEqual(near.sourcePositions,near.targetSourcePositions);assert.notEqual(near.sourceSha256,rest.sourceSha256);
assert(!document.body.dataset.ready.includes('error'));console.log('Actual component-fit UI handler fixture: byte/hash load, shared drag, source preservation, zero gain, reset and export passed; not browser verified');

// S2 closed part proxies; no hidden main-photo texture is marked usable.
import fs from 'node:fs';import crypto from 'node:crypto';
import {sceneModel} from '../../character-prototype/preview/scene-model.mjs';
import {buildConnectedProxy} from '../../character-prototype/preview/connected-proxy.mjs';
const out=new URL('../app/src/main/assets/',import.meta.url),check=process.argv.includes('--check'),model=buildConnectedProxy();
const write=(name,b)=>{const p=new URL(name,out);if(check){if(!fs.existsSync(p)||!fs.readFileSync(p).equals(b))throw Error('Stale scene asset '+name);}else fs.writeFileSync(p,b);return {name,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')};};
const f32=a=>{const b=Buffer.alloc(a.length*4);a.forEach((n,i)=>b.writeFloatLE(n,i*4));return b;};
const u16=a=>{const b=Buffer.alloc(a.length*2);a.forEach((n,i)=>b.writeUInt16LE(n,i*2));return b;};
const report={version:2,scene:sceneModel,grid:model.grid,bones:model.bones,parts:model.parts,vertices:model.positions.length/3,triangles:model.indices.length/3,bins:[write('scene_positions.bin',f32(model.positions)),write('scene_normals.bin',f32(model.normals)),write('scene_uv.bin',f32(model.uv)),write('scene_confidence.bin',f32(model.confidence)),write('scene_regions.bin',f32(model.region)),write('scene_skin.bin',f32(model.skinWeights)),write('scene_indices.bin',u16(model.indices))],usage:'S2 inferred structural/debug proxy. Production uses calibrated front projection; hidden parts remain untextured pending S3.'};
write('scene-report.json',Buffer.from(JSON.stringify(report,null,2)+'\n'));console.log(JSON.stringify({vertices:report.vertices,triangles:report.triangles,check}));

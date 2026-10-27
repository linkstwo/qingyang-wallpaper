import fs from 'node:fs';
import crypto from 'node:crypto';
import {buildRoundOneScene} from '../../character-prototype/preview/round-one-scene.mjs';
const out=new URL('../app/src/main/assets/',import.meta.url),check=process.argv.includes('--check'),scene=buildRoundOneScene(),files=[];
function output(name,bytes){const p=new URL(name,out);if(check){if(!fs.existsSync(p)||!fs.readFileSync(p).equals(bytes))throw Error('Stale first-pass asset: '+name);}else fs.writeFileSync(p,bytes);files.push({name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
function bin(name,values){const b=Buffer.alloc(values.length*4);values.forEach((v,i)=>{if(!Number.isFinite(v))throw Error('Nonfinite '+name);b.writeFloatLE(v,i*4);});output(name,b);}
bin('round_character_mesh.bin',scene.body.uv.map((v,i)=>v*[1152,1536][i%2]));
bin('round_character_pins.bin',scene.body.supportWeights);
bin('round_character_depth.bin',scene.body.positions.filter((_,i)=>i%3===2));
bin('round_foreground_mesh.bin',scene.paper.uv.map((v,i)=>v*[1152,1536][i%2]));
const side=scene.sideBack,expand=(values,size)=>side.indices.flatMap(i=>values.slice(i*size,i*size+size));
bin('side_back_mesh.bin',expand(side.source,2));bin('side_back_depth.bin',expand(side.depth,1));bin('side_back_uv.bin',expand(side.uv,2));
const texture=fs.readFileSync(new URL('../../'+scene.roundOne.source,import.meta.url));
// Resolve repository path independently of the invoking working directory.
if(crypto.createHash('sha256').update(texture).digest('hex')!==scene.roundOne.sourceSha256)throw Error('Wrong side-back donor');
output('side-back.png',texture);
const report={version:1,characterTriangles:scene.body.vertices/3,paperTriangles:scene.paper.vertices/3,sideBackTriangles:side.indices.length/3,sideBackSource:scene.roundOne.source,sideBackSourceSha256:scene.roundOne.sourceSha256,approximateRegistration:true,phoneTested:false,wholeTasksAccepted:[],files};
output('round-one-report.json',Buffer.from(JSON.stringify(report,null,2)+'\n'));console.log(JSON.stringify({check,...report,files:files.length}));

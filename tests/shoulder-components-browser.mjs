// Local real-WebGL controls test, no user browser/session or external network.
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import http from 'node:http';import path from 'node:path';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright'),root=path.resolve(import.meta.dirname,'..');
const types={'.html':'text/html','.mjs':'text/javascript','.png':'image/png','.vert':'text/plain','.frag':'text/plain','.json':'application/json'};
const server=http.createServer(async(req,res)=>{try{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',types[path.extname(p)]||'application/octet-stream');res.end(await fs.readFile(p));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[],cases=[];
try{
 browser=await chromium.launch({executablePath:process.argv[2],headless:true,args:['--no-sandbox','--disable-background-networking','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1200,height:1000}});page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
 const base='http://127.0.0.1:'+server.address().port;await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 await page.goto(base+'/character-prototype/preview/parts-fit.html');await page.waitForFunction(()=>document.body.dataset.ready==='true');
 const manifest=JSON.parse(await fs.readFile(path.join(root,'references/derived/side-b-component-manifest.json'),'utf8'));
 for(let i=0;i<2;i++){
  const key=['sideBNape','sideBUpperArm'][i],row=manifest.components[i];
  await page.locator('#source').selectOption(key);
  await page.waitForFunction(sha=>{try{return JSON.parse(document.getElementById('data').textContent).sourceSha256===sha}catch{return false}},row.outputSha256);
  await page.locator('#part').selectOption(i?'arm':'shoulder');
  await page.locator('#demo').click();
  const draft=JSON.parse(await page.locator('#data').textContent());
  assert.equal(draft.confidence,0);assert.deepEqual(draft.size,row.size);assert(draft.minimumAreaRatio>0);assert(draft.handles.some(h=>h.source.some((v,k)=>v!==h.target[k])));
  await page.locator('#save').click();await page.locator('#reset').click();await page.locator('#restore').click();
  const restored=JSON.parse(await page.locator('#data').textContent());assert.deepEqual(restored.handles,draft.handles);assert.equal(restored.sourceSha256,row.outputSha256);
  cases.push({source:key,size:row.size,sourceSha256:row.outputSha256,minimumAreaRatio:draft.minimumAreaRatio,savedRestored:true,confidence:0});
  await page.screenshot({type:'jpeg',quality:84,path:path.join(root,'validation',`shoulder-components-${key}.jpg`)});
 }
 assert.deepEqual(errors,[]);const report={cases,pageErrors:errors,oneDonorView:true,continuousViewAccepted:false,phoneTested:false};await fs.writeFile(path.join(root,'validation/shoulder-components-browser.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(e){console.error(JSON.stringify({pageErrors:errors,cases,message:e.message}));throw e;}finally{await browser?.close();await new Promise(r=>server.close(r));}

// Local real-WebGL controls test, no user browser/session or external network.
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import http from 'node:http';import path from 'node:path';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright'),root=path.resolve(import.meta.dirname,'..');
const types={'.html':'text/html','.mjs':'text/javascript','.png':'image/png','.vert':'text/plain','.frag':'text/plain','.json':'application/json'};
const server=http.createServer(async(req,res)=>{try{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',types[path.extname(p)]||'application/octet-stream');res.end(await fs.readFile(p));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[],cases=[];
try{
 browser=await chromium.launch({executablePath:process.argv[2],headless:true,args:['--no-sandbox','--disable-background-networking','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1360,height:1100}});page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));
 const base='http://127.0.0.1:'+server.address().port;await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 await page.goto(base+'/character-prototype/preview/structural-lab.html');await page.waitForFunction(()=>document.body.dataset.ready==='true');
 for(const id of ['paperPartition','paperContact','paperTrim','seatSupport'])assert.equal(await page.locator('#'+id).isChecked(),false);
 await page.locator('#rear').uncheck();await page.locator('#paperPartition').check();await page.locator('#paperContact').check();
 for(const volume of [false,true]){
  if(volume)await page.locator('#forearmVolume').check();
  await page.locator('#seatSupport').check();
  await page.locator('#body').fill('3.3');await page.locator('#body').dispatchEvent('input');
  await page.locator('#camera').fill('-20');await page.locator('#camera').dispatchEvent('input');
  const frame=await page.evaluate(async()=>{const {captureFrame}=await import(document.querySelector('script[type="module"]').src);const f=await captureFrame();let nonzero=0;for(let i=0;i<f.pixels.length;i+=4)if(f.pixels[i]>50||f.pixels[i+1]>50||f.pixels[i+2]>50)nonzero++;return {width:f.width,height:f.height,nonzero};});
  assert(frame.nonzero>1000,'actual framebuffer must contain rendered character');cases.push({forearmVolume:volume,paperTrim:false,seatSupport:true,...frame});
  await page.screenshot({type:'jpeg',quality:84,path:path.join(root,'validation',`paper-lab-candidate-${volume?'forearm':'plain'}.jpg`)});
  await page.locator('#seatSupport').uncheck();
 }
 await page.locator('#paperTrim').check();assert.equal(await page.locator('#paperTrim').isChecked(),true);
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(root,'validation/paper-lab-candidates-browser.json'),JSON.stringify({cases,pageErrors:errors,realWebgl:true,visualAcceptance:false,phoneTested:false},null,2)+'\n');console.log(JSON.stringify({cases,pageErrors:errors}));
}catch(e){console.error(JSON.stringify({pageErrors:errors,cases,message:e.message}));throw e;}finally{await browser?.close();await new Promise(r=>server.close(r));}

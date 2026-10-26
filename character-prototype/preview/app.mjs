import {makeLayeredCharacterMesh} from './layered-mesh.mjs';
import {makeMesh,clamp,demoInput} from './rig.mjs';
import {Response,framing as currentFraming,legacyFraming} from './response.mjs';
import {bodyContactWeights as contactWeights} from './contact-rig.mjs';
import {depthWeights} from './structure.mjs';
const canvas=document.querySelector('#scene'),stage=document.querySelector('#stage'),phase=document.querySelector('#phase'),stats=document.querySelector('#stats');
const query=new URLSearchParams(location.search);
const framing=query.has('baseline056')?legacyFraming:currentFraming;
const lively=!(query.has('baseline056')||query.has('motion056'));
try { await start(); } catch(error) {phase.classList.add('error');phase.textContent='加载失败：'+error.message;console.error(error);}
async function start(){
  const config=await fetch('./mesh.json').then(r=>{if(!r.ok)throw Error('网格文件不可读');return r.json();});
  const [W,H]=config.canvas;
  const gl=canvas.getContext('webgl',{alpha:false,antialias:true,preserveDrawingBuffer:true});
  if(!gl)throw Error('当前浏览器没有提供WebGL');
  const loadText=async name=>{const r=await fetch(name);if(!r.ok)throw Error('着色器不可读 '+name);return r.text();};
  const [vertex,fragment]=await Promise.all(['scene.vert','scene.frag'].map(loadText));
  const compile=(type,text)=>{const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const uniform=name=>gl.getUniformLocation(program,name),pos=gl.getAttribLocation(program,'a_source'),pin=gl.getAttribLocation(program,'a_pin'),depth=gl.getAttribLocation(program,'a_depth');
  const U=Object.fromEntries(['size','view','body','chest','hair','layer','texture','mask','maskMode','cover','ndcScale','ndcOffset','motionGain','tipMode','softFrame','structureMode'].map(n=>[n,uniform('u_'+n)]));
  gl.uniform2f(U.size,W,H);gl.uniform1i(U.texture,0);gl.uniform1i(U.mask,1);gl.enableVertexAttribArray(pos);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  const texture=async name=>{const img=new Image();img.src=name;await img.decode();if(img.width!==W||img.height!==H)throw Error('素材尺寸未对齐');const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);return tex;};
  const original=await texture(config.texture),background=await texture(config.background),mask=await texture('mask.png');
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,mask);gl.activeTexture(gl.TEXTURE0);
  const buffer=data=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return {b,count:data.length/2};};
  const quad=buffer(new Float32Array([0,0,W,0,0,H,0,H,W,0,W,H]));
  // The generated mask supplies detailed hair and limb boundaries; all RGB is
  // sampled from the untouched source image, not a regenerated character.
  const characterData=makeLayeredCharacterMesh(config.limits.triangleEdgePixels),character=buffer(characterData);
  const pins=buffer(contactWeights(characterData)),depths=buffer(depthWeights(characterData));
  const foreground=buffer(makeMesh(config.foregroundOutline,[],80));
  const draw=(mesh,tex,layer,maskMode=0)=>{
    gl.uniform1f(U.layer,layer);gl.uniform1f(U.maskMode,maskMode);gl.bindTexture(gl.TEXTURE_2D,tex);
    if(layer===1){gl.enableVertexAttribArray(depth);gl.bindBuffer(gl.ARRAY_BUFFER,depths.b);gl.vertexAttribPointer(depth,1,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(pin);gl.bindBuffer(gl.ARRAY_BUFFER,pins.b);gl.vertexAttribPointer(pin,1,gl.FLOAT,false,0,0);}
    else{gl.disableVertexAttribArray(depth);gl.vertexAttrib1f(depth,0);gl.disableVertexAttribArray(pin);gl.vertexAttrib1f(pin,0);}
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.b);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  };
  const resize=()=>{const dpr=Math.min(devicePixelRatio,2),r=stage.getBoundingClientRect();canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);gl.viewport(0,0,canvas.width,canvas.height);};
  new ResizeObserver(resize).observe(stage);resize();
  const composition=document.querySelector('#composition'),response=document.querySelector('#response');
  composition.value=query.get('composition')||'wide';response.value=query.get('response')||'elastic';
  let model=new Response(response.value!=='legacy',lively),target={x:0,y:0},view=model.view;
  let visualValues=model.values,last=performance.now(),startDemo=null,fpsTime=last,frames=0,fps=0,paused=false,accumulator=0,gyroDemo=false;
  const frameStatus={triangles:character.count/3,loaded:true,mode:'idle',desktopOnly:true};
  document.body.dataset.ready='true';document.body.dataset.triangles=String(character.count/3);
  function reset(){model.reset();view=model.view;visualValues=model.values;target={x:0,y:0};startDemo=null;gyroDemo=false;accumulator=0;phase.textContent='已回到正中 · 移动指针观察';}
  document.querySelector('#reset').onclick=reset;
  document.querySelector('#demo').onclick=()=>{reset();startDemo=performance.now();};
  document.querySelector('#gyro').onclick=()=>{reset();gyroDemo=true;startDemo=performance.now();};
  response.onchange=()=>{model=new Response(response.value!=='legacy',lively);reset();};
  const getInput=t=>gyroDemo?{x:0,y:0,alphaY:t<2?35*Math.sin(t*2*Math.PI*3):0,alphaX:t<2?20*Math.sin(t*2*Math.PI*2.2):0,phase:t<2?'只转动输入 · 观看角度保持正中':'停止转动 · 等待余振衰减',done:t>7}:demoInput(t);
  function pointer(e){if(startDemo!==null)return;const r=stage.getBoundingClientRect();target={x:clamp((e.clientX-r.left)/r.width*2-1,-1,1),y:clamp((e.clientY-r.top)/r.height*2-1,-1,1)};phase.textContent='手动预览 · 保持指针位置即可保持当前转向';}
  stage.addEventListener('pointermove',pointer);stage.addEventListener('pointerdown',pointer);
  document.addEventListener('visibilitychange',()=>{paused=document.hidden;last=performance.now();accumulator=0;if(paused)reset();});
  if(query.has('demo'))startDemo=performance.now();
  const fixed=query.has('gyroFrame')?Math.max(0,Number(query.get('gyroFrame'))):query.has('frame')?Math.max(0,Number(query.get('frame'))):null;
  gyroDemo=query.has('gyroFrame');
  const physics=(dt,input=target)=>{model.step(dt,input);view=model.view;visualValues=model.values;};
  if(fixed!==null){for(let t=0;t<fixed;t+=1/120)physics(1/120,getInput(t));phase.textContent=getInput(fixed).phase;}
  const transform=frame=>{gl.uniform2f(U.ndcScale,2*frame.scale/canvas.width,-2*frame.scale/canvas.height);gl.uniform2f(U.ndcOffset,2*frame.x/canvas.width-1,1-2*frame.y/canvas.height);};
  window.qingyang={model:()=>model,reset,setInput:input=>{startDemo=null;target=input;},advance:(seconds,input)=>{for(let t=0;t<seconds-1e-8;t+=1/120)physics(1/120,input);},hairWeight:null};
  function render(now){
    const dt=clamp((now-last)/1000,0,0.1);last=now;
    if(!paused){
      if(fixed===null){accumulator+=dt;while(accumulator>=1/120){if(startDemo!==null){const d=getInput((now-startDemo)/1000-accumulator);target=d;phase.textContent=d.phase;if(d.done)startDemo=null;}physics(1/120);accumulator-=1/120;}}
      gl.uniform2f(U.view,view.x,view.y);gl.uniform2f(U.body,visualValues[0],visualValues[1]);gl.uniform3f(U.chest,visualValues[2],visualValues[3],visualValues[6]);gl.uniform2f(U.hair,visualValues[4],visualValues[5]);gl.uniform1f(U.cover,1);
      gl.clearColor(0.1,0.1,0.1,1);gl.clear(gl.COLOR_BUFFER_BIT);
      const wider=composition.value==='wide',frame=framing(canvas.width,canvas.height,wider,Number(document.querySelector('#size').value),Number(document.querySelector('#top').value));
      gl.uniform1f(U.motionGain,frame.motionGain);gl.uniform1f(U.tipMode,response.value==='legacy'?0:1);gl.uniform1f(U.softFrame,wider?1:0);gl.uniform1f(U.structureMode,document.querySelector('#structure').checked?1:0);
      if(wider){transform(framing(canvas.width,canvas.height,false));draw(quad,background,-1);}
      transform(frame);
      document.body.dataset.framing=JSON.stringify(frame);
      draw(quad,original,0);draw(quad,background,0,2);draw(character,original,1,1);draw(foreground,original,3);
      frames++;if(now-fpsTime>=600){fps=Math.round(frames*1000/(now-fpsTime));frames=0;fpsTime=now;}
      stats.textContent=`桌面 ${fps||'—'} fps · ${frameStatus.triangles} 个三角形\n视角 ${view.x.toFixed(3)}, ${view.y.toFixed(3)}\n胸部回弹 ${visualValues[2].toFixed(2)}, ${visualValues[3].toFixed(2)} px`;
      document.body.dataset.view=JSON.stringify(view);document.body.dataset.physics=JSON.stringify(visualValues.map(v=>+v.toFixed(5)));document.body.dataset.fps=String(fps);
      window.qingyang.frame={view:{...view},physics:[...visualValues],framing:frame};
    }
    requestAnimationFrame(render);
  }
  phase.textContent=fixed!==null?demoInput(fixed).phase:'已加载 · 缓慢移动指针，或播放动作演示';requestAnimationFrame(render);
  if(query.has('record')){
    if(!window.MediaRecorder)throw Error('浏览器不支持演示录制');
    const stream=canvas.captureStream(30),mime='video/webm;codecs=vp9',chunks=[];
    const recorder=new MediaRecorder(stream,{mimeType:MediaRecorder.isTypeSupported(mime)?mime:'video/webm',videoBitsPerSecond:4500000});
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=async()=>{try{const result=await fetch('/capture',{method:'POST',headers:{'Content-Type':'video/webm'},body:new Blob(chunks,{type:'video/webm'})});if(!result.ok)throw Error('保存失败 '+result.status);document.body.dataset.recording='saved';phase.textContent='18秒演示已保存到本地工程';}catch(e){document.body.dataset.recording='failed';phase.textContent=e.message;}};
    requestAnimationFrame(()=>{reset();startDemo=performance.now();document.body.dataset.recording='active';recorder.start();setTimeout(()=>{recorder.stop();stream.getTracks().forEach(t=>t.stop());},18700);});
  }
}

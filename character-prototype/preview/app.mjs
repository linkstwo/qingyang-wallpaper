import {Spring,makeMesh,clamp,demoInput} from './rig.mjs';
import {contactWeights} from './contact-rig.mjs';
const canvas=document.querySelector('#scene'),stage=document.querySelector('#stage'),phase=document.querySelector('#phase'),stats=document.querySelector('#stats');
const query=new URLSearchParams(location.search);
try { await start(); } catch(error) {phase.classList.add('error');phase.textContent='加载失败：'+error.message;console.error(error);}
async function start(){
  const config=await fetch('./mesh.json').then(r=>{if(!r.ok)throw Error('网格文件不可读');return r.json();});
  const [W,H]=config.canvas;
  const gl=canvas.getContext('webgl',{alpha:false,antialias:true,preserveDrawingBuffer:true});
  if(!gl)throw Error('当前浏览器没有提供WebGL');
  const vertex=`
  precision highp float;
  attribute vec2 a_source;
  attribute float a_pin;
  uniform vec2 u_size,u_view,u_body,u_chest;
  uniform float u_layer,u_hair;
  varying vec2 v_uv;
  float bell(vec2 p,vec2 c,vec2 r){vec2 d=(p-c)/r;return exp(-dot(d,d)*2.0);}
  void main(){
    vec2 p=a_source, q=p;
    v_uv=p/u_size;
    if(u_layer<0.5){q+=u_view*vec2(3.0,2.0);}
    else if(u_layer<1.5){
      // Character + paper is one continuous textured surface. Region fields
      // preserve clothing continuity; paper/hands/seat have explicit zero weights.
      float active=1.0-a_pin;
      float head=1.0-smoothstep(340.0,495.0,p.y);
      float neck=bell(p,vec2(630.0,410.0),vec2(220.0,180.0));
      float chest=bell(p,vec2(577.0,785.0),vec2(165.0,205.0));
      float shoulder=bell(p,vec2(815.0,528.0),vec2(170.0,210.0));
      float torso=bell(p,vec2(721.0,789.0),vec2(310.0,430.0));
      float cheek=bell(p,vec2(392.0,333.0),vec2(170.0,155.0));
      float hair=bell(p,vec2(246.0,367.0),vec2(110.0,210.0));
      float depth=19.0*torso+11.0*shoulder+20.0*chest+head*(11.0+13.0*cheek);
      vec2 turn=vec2(u_view.x*depth, u_view.y*depth*0.63);
      // Small cross-section compression changes width while retaining the source face.
      turn.x+=(p.x-560.0)*(-0.006*u_view.x)*head;
      turn.y+=(p.x-650.0)*u_view.y*0.008*torso;
      vec2 inertia=u_body*(0.32+0.68*torso+0.22*neck);
      inertia+=u_chest*chest;
      inertia+=vec2(u_hair,u_hair*0.35)*hair;
      inertia+=u_body*0.3*head;
      q+=(turn+inertia)*active;
    }
    else if(u_layer>2.5){q+=u_view*vec2(4.0,2.5);}
    gl_Position=vec4(q.x/u_size.x*2.0-1.0,1.0-q.y/u_size.y*2.0,0.0,1.0);
  }`;
  const fragment=`precision highp float;varying vec2 v_uv;uniform sampler2D u_texture,u_mask;uniform float u_maskMode,u_cover;uniform vec2 u_size;
  void main(){float alpha=1.0;if(u_maskMode>0.5){alpha=texture2D(u_mask,v_uv).r;if(u_maskMode>1.5){vec2 d=vec2(3.0)/u_size;alpha=max(alpha,texture2D(u_mask,v_uv+d).r);alpha=max(alpha,texture2D(u_mask,v_uv-d).r);alpha=max(alpha,texture2D(u_mask,v_uv+vec2(d.x,-d.y)).r);alpha=max(alpha,texture2D(u_mask,v_uv+vec2(-d.x,d.y)).r);alpha*=u_cover;}}gl_FragColor=vec4(texture2D(u_texture,v_uv).rgb,alpha);}`;
  const compile=(type,text)=>{const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const uniform=name=>gl.getUniformLocation(program,name),pos=gl.getAttribLocation(program,'a_source'),pin=gl.getAttribLocation(program,'a_pin');
  const U=Object.fromEntries(['size','view','body','chest','hair','layer','texture','mask','maskMode','cover'].map(n=>[n,uniform('u_'+n)]));
  gl.uniform2f(U.size,W,H);gl.uniform1i(U.texture,0);gl.uniform1i(U.mask,1);gl.enableVertexAttribArray(pos);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  const texture=async name=>{const img=new Image();img.src=name;await img.decode();if(img.width!==W||img.height!==H)throw Error('素材尺寸未对齐');const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);return tex;};
  const original=await texture(config.texture),background=await texture(config.background),mask=await texture('mask.png');
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,mask);gl.activeTexture(gl.TEXTURE0);
  const buffer=data=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return {b,count:data.length/2};};
  const quad=buffer(new Float32Array([0,0,W,0,0,H,0,H,W,0,W,H]));
  // The generated mask supplies detailed hair and limb boundaries; all RGB is
  // sampled from the untouched source image, not a regenerated character.
  const characterData=makeMesh([[0,0],[W,0],[W,H],[0,H]],[],config.limits.triangleEdgePixels),character=buffer(characterData);
  const pins=buffer(contactWeights(characterData));
  const foreground=buffer(makeMesh(config.foregroundOutline,[],80));
  const draw=(mesh,tex,layer,maskMode=0)=>{
    gl.uniform1f(U.layer,layer);gl.uniform1f(U.maskMode,maskMode);gl.bindTexture(gl.TEXTURE_2D,tex);
    if(layer===1){gl.enableVertexAttribArray(pin);gl.bindBuffer(gl.ARRAY_BUFFER,pins.b);gl.vertexAttribPointer(pin,1,gl.FLOAT,false,0,0);}
    else{gl.disableVertexAttribArray(pin);gl.vertexAttrib1f(pin,0);}
    gl.bindBuffer(gl.ARRAY_BUFFER,mesh.b);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  };
  const resize=()=>{const dpr=Math.min(devicePixelRatio,2),r=stage.getBoundingClientRect();canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);gl.viewport(0,0,canvas.width,canvas.height);};
  new ResizeObserver(resize).observe(stage);resize();
  const springs={};for(const [name,c] of Object.entries(config.springs)){springs[name+'X']=new Spring(c);springs[name+'Y']=new Spring(c);}
  let target={x:0,y:0},view={x:0,y:0},prevVelocity={x:0,y:0},last=performance.now(),startDemo=null,fpsTime=last,frames=0,fps=0,paused=false;
  let visualValues=[0,0,0,0,0],lastFrame=null;
  const frameStatus={triangles:character.count/3,loaded:true,mode:'idle',desktopOnly:true};
  // Diagnostic values are intentionally visible in the DOM for acceptance.
  document.body.dataset.ready='true';document.body.dataset.triangles=String(character.count/3);
  function reset(){target={x:0,y:0};view={x:0,y:0};prevVelocity={x:0,y:0};Object.values(springs).forEach(s=>s.reset());startDemo=null;phase.textContent='已回到正中 · 移动指针观察';}
  document.querySelector('#reset').onclick=reset;
  document.querySelector('#demo').onclick=()=>{reset();startDemo=performance.now();};
  function pointer(e){if(startDemo!==null)return;const r=stage.getBoundingClientRect();target={x:clamp((e.clientX-r.left)/r.width*2-1,-1,1),y:clamp((e.clientY-r.top)/r.height*2-1,-1,1)};phase.textContent='手动预览 · 保持指针位置即可保持当前转向';}
  stage.addEventListener('pointermove',pointer);stage.addEventListener('pointerdown',pointer);
  // Pointer leaving does not reset orientation: holding a phone tilt must hold a view.
  document.addEventListener('visibilitychange',()=>{paused=document.hidden;last=performance.now();if(paused)Object.values(springs).forEach(s=>s.reset());});
  if(query.has('demo'))startDemo=performance.now();
  const fixed=query.has('frame')?Math.max(0,Number(query.get('frame'))):null;
  function physics(dt){
    const old={...view},s=1-Math.exp(-dt*12);view.x+=(target.x-view.x)*s;view.y+=(target.y-view.y)*s;
    const vx=(view.x-old.x)/dt,vy=(view.y-old.y)/dt;
    const ax=clamp((vx-prevVelocity.x)/dt,-180,180),ay=clamp((vy-prevVelocity.y)/dt,-180,180);prevVelocity={x:vx,y:vy};
    const bx=springs.bodyX.step(-ax*1.4,dt),by=springs.bodyY.step(-ay*1.4,dt);
    const cx=springs.chestX.step(-ax*3.4-bx*60,dt),cy=springs.chestY.step(-ay*4.2-by*75,dt);
    const hair=springs.hairX.step(-ax*2.2,dt);
    visualValues=[bx*config.limits.bodyPixels,by*config.limits.bodyPixels,cx*config.limits.chestPixels,cy*config.limits.chestPixels,hair*config.limits.hairPixels];
  }
  if(fixed!==null){for(let t=0;t<fixed;t+=1/120){const d=demoInput(t);target={x:d.x,y:d.y};physics(1/120);}const d=demoInput(fixed);phase.textContent=d.phase;}
  function render(now){
    const dt=clamp((now-last)/1000,1/240,1/20);last=now;
    if(!paused){
      if(fixed===null){if(startDemo!==null){const d=demoInput((now-startDemo)/1000);target={x:d.x,y:d.y};phase.textContent=d.phase;if(d.done)startDemo=null;}physics(dt);}
      gl.uniform2f(U.view,view.x,view.y);gl.uniform2f(U.body,visualValues[0],visualValues[1]);gl.uniform2f(U.chest,visualValues[2],visualValues[3]);gl.uniform1f(U.hair,visualValues[4]);gl.uniform1f(U.cover,clamp(Math.hypot(view.x,view.y)*100+Math.max(...visualValues.map(Math.abs))*3,0,1));
      gl.clearColor(0.1,0.1,0.1,1);gl.clear(gl.COLOR_BUFFER_BIT);
      draw(quad,original,0);draw(quad,background,0,2);draw(character,original,1,1);draw(foreground,original,3);
      frames++;if(now-fpsTime>=600){fps=Math.round(frames*1000/(now-fpsTime));frames=0;fpsTime=now;}
      stats.textContent=`桌面 ${fps||'—'} fps · ${frameStatus.triangles} 个三角形\n视角 ${view.x.toFixed(3)}, ${view.y.toFixed(3)}\n胸部回弹 ${visualValues[2].toFixed(2)}, ${visualValues[3].toFixed(2)} px`;
      document.body.dataset.view=JSON.stringify(view);document.body.dataset.physics=JSON.stringify(visualValues.map(v=>+v.toFixed(5)));document.body.dataset.fps=String(fps);
      lastFrame={view:{...view},physics:[...visualValues]};
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

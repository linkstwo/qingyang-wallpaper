import {buildConnectedProxy} from './connected-proxy.mjs';
import {poseConnectedProxy,poseUniforms,geometricNormals} from './structural-pose.mjs';
import {backChart,buildBackChart,validateBackChart} from './material-chart.mjs';
const $=id=>document.getElementById(id),canvas=$('scene'),gl=canvas.getContext('webgl',{alpha:false,depth:true,antialias:true}),source=$('source'),ctx=source.getContext('2d'),clone=x=>JSON.parse(JSON.stringify(x)),KEY='qingyang-back-chart-v1';
let draft=clone(backChart),model,program,tex,image,normalBuffer,uvBuffer,candidateBuffer,matrices,animate=false,raf=0,ready=false,sourceHash='',drag=null,failed=false;
function fail(error){failed=true;cancelAnimationFrame(raf);$('error').textContent=String(error.stack||error);$('status').textContent='工作台加载失败';document.body.dataset.ready='error';}
window.addEventListener('error',e=>fail(e.error||e.message));window.addEventListener('unhandledrejection',e=>fail(e.reason));
function shader(kind,text){const s=gl.createShader(kind);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function attribute(name,array,width,stride=0,offset=0){const loc=gl.getAttribLocation(program,name),b=gl.createBuffer();if(loc<0)return null;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(array),gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,width,gl.FLOAT,false,stride,offset);return b;}
function updateBuffer(buffer,array){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,array instanceof Float32Array?array:new Float32Array(array),gl.DYNAMIC_DRAW);}
function pose(){if(!model)return;const input={yaw:Number($('body').value)*Math.PI/180,roll:Number($('roll').value)*Math.PI/180};matrices=poseUniforms(input);updateBuffer(normalBuffer,geometricNormals(poseConnectedProxy(model,input).positions,model.indices));request();}
function mapping(){if(!ready)return;const chart=buildBackChart(model,draft);updateBuffer(uvBuffer,chart.uv);updateBuffer(candidateBuffer,chart.candidate);$('json').value=JSON.stringify({sourceSha256:sourceHash,chart:draft},null,2);drawSource();request();}
function drawSource(){ctx.clearRect(0,0,source.width,source.height);ctx.drawImage(image,0,0,source.width,source.height);for(const [i,row] of draft.rows.entries()){ctx.strokeStyle='#a6f0dc';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(...row.left.map(x=>x*.5));ctx.lineTo(...row.right.map(x=>x*.5));ctx.stroke();for(const side of ['left','right']){const [x,y]=row[side].map(v=>v*.5);ctx.fillStyle=side==='left'?'#ffb4d8':'#73f4d3';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#10212b';ctx.fillText(String(i+1),x-3,y+3);}}}
function request(){if(ready&&!raf&&!failed)raf=requestAnimationFrame(render);}
function render(time){raf=0;if(!ready||document.hidden||failed)return;
 if(animate){$('camera').value=String(Math.round(Math.sin(time/5000)*180));values();}
 const ratio=Math.min(devicePixelRatio||1,1.5),w=Math.max(1,Math.round(canvas.clientWidth*ratio)),h=Math.max(1,Math.round(canvas.clientHeight*ratio));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);gl.useProgram(program);gl.clearColor(.05,.075,.115,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 for(let i=0;i<6;i++)gl.uniformMatrix4fv(gl.getUniformLocation(program,`u_bones[${i}]`),false,matrices[i]);
 gl.uniform2f(gl.getUniformLocation(program,'u_camera'),Number($('camera').value)*Math.PI/180,Number($('pitch').value)*Math.PI/180);
 const mode=$('mode').value;gl.uniform1f(gl.getUniformLocation(program,'u_mode'),({region:0,normal:1,depth:2,support:3})[mode]||0);gl.uniform1f(gl.getUniformLocation(program,'u_photo'),mode==='photo'?1:0);gl.drawElements(gl.TRIANGLES,model.indices.length,gl.UNSIGNED_SHORT,0);
 const error=gl.getError();if(error!==gl.NO_ERROR)return fail(new Error('WebGL error '+error));
 document.body.dataset.ready='true';if(animate)request();
}
function values(){for(const [id,out] of [['camera','cameraValue'],['pitch','pitchValue'],['body','bodyValue'],['roll','rollValue']])$(out).value=$(id).value+'°';}
function sourcePoint(e){const r=source.getBoundingClientRect();return [(e.clientX-r.left)/r.width*1086,(e.clientY-r.top)/r.height*1448];}
source.addEventListener('pointerdown',e=>{if(!ready)return;const p=sourcePoint(e);let nearest=30;for(let i=0;i<draft.rows.length;i++)for(const side of ['left','right']){const q=draft.rows[i][side],d=Math.hypot(p[0]-q[0],p[1]-q[1]);if(d<nearest){nearest=d;drag={i,side};}}if(drag){source.setPointerCapture(e.pointerId);e.preventDefault();}});
source.addEventListener('pointermove',e=>{if(!drag)return;const trial=clone(draft);trial.rows[drag.i][drag.side]=sourcePoint(e).map((v,k)=>Math.max(0,Math.min(draft.sourceSize[k]-1,v)));if(validateBackChart(trial)){draft=trial;mapping();$('draftStatus').textContent='草稿已调整，尚未保存 · 可信度仍为0';}});
function release(){drag=null;}source.addEventListener('pointerup',release);source.addEventListener('pointercancel',release);source.addEventListener('lostpointercapture',release);
for(const id of ['camera','pitch','body','roll'])$(id).addEventListener('input',()=>{values();if(id==='body'||id==='roll')pose();else request();});$('mode').addEventListener('change',request);
$('front').onclick=()=>{$('camera').value=0;$('pitch').value=0;values();request();};$('back').onclick=()=>{$('camera').value=180;$('pitch').value=0;values();request();};
$('motion').onclick=()=>{animate=!animate;$('motion').textContent=animate?'停止往返':'往返观察';$('motion').setAttribute('aria-pressed',String(animate));request();};
$('reset').onclick=()=>{draft=clone(backChart);mapping();$('draftStatus').textContent='已恢复默认配准 · 可信度仍为0';};
$('save').onclick=()=>{try{localStorage.setItem(KEY,JSON.stringify({sourceSha256:sourceHash,chart:draft}));$('draftStatus').textContent='配准草稿已保存到此浏览器 · 可信度仍为0';}catch(e){$('draftStatus').textContent='无法保存草稿：'+e.message;}};
$('restore').onclick=()=>{try{const saved=JSON.parse(localStorage.getItem(KEY));if(!saved||saved.sourceSha256!==sourceHash||!validateBackChart(saved.chart))throw Error('没有与当前原图一致的有效草稿');draft=clone(saved.chart);mapping();$('draftStatus').textContent='已恢复草稿 · 可信度仍为0';}catch(e){$('draftStatus').textContent=e.message;}};
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else request();});window.addEventListener('resize',request);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail(new Error('图形上下文已丢失，请刷新工作台恢复。'));});
async function init(){if(!gl)throw Error('此浏览器无法创建WebGL');if(gl.getParameter(gl.MAX_VERTEX_ATTRIBS)<8)throw Error('需要8个顶点属性');
 model=buildConnectedProxy();let vertex=await (await fetch('./structural-skin.vert')).text();vertex=vertex.replace('void main(){','attribute vec2 a_uv;attribute float a_candidate;varying vec2 v_uv;varying float v_candidate;\nvoid main(){v_uv=a_uv;v_candidate=a_candidate;');
 const fragment='precision highp float;uniform sampler2D u_source;uniform float u_photo;varying vec3 v_color;varying vec2 v_uv;varying float v_candidate;void main(){vec3 c=v_color;if(u_photo>.5&&v_candidate>.999)c=texture2D(u_source,v_uv).rgb;gl_FragColor=vec4(c,1);}';
 program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 attribute('a_position',model.positions,3);normalBuffer=attribute('a_normal',model.normals,3);attribute('a_weights0',model.skinWeights,4,24,0);attribute('a_weights1',model.skinWeights,2,24,16);attribute('a_support',model.supportWeights,1);attribute('a_region',model.region,1);uvBuffer=attribute('a_uv',Array(model.positions.length/3*2).fill(0),2);candidateBuffer=attribute('a_candidate',Array(model.positions.length/3).fill(0),1);
 const index=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(model.indices),gl.STATIC_DRAW);
 const response=await fetch('../../'+backChart.source);if(!response.ok)throw Error('背部原图读取失败');const bytes=await response.arrayBuffer();sourceHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');const blob=new Blob([bytes],{type:'image/png'});image=new Image();const url=URL.createObjectURL(blob);try{image.src=url;await image.decode();}finally{URL.revokeObjectURL(url);}if(image.width!==1086||image.height!==1448)throw Error('原图尺寸变化，需重新核对草稿');
 tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(program,'u_source'),0);
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.enable(gl.CULL_FACE);gl.frontFace(gl.CW);ready=true;pose();mapping();$('status').textContent=`${model.positions.length/3} 顶点 · ${model.indices.length/3} 三角形 · 原图/相机/柔性求解器未改`;request();
}
init().catch(fail);

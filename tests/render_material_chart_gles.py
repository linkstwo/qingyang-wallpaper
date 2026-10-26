"""Provisional back-patch reveal experiment. Uncalibrated, never production-ready."""
import ctypes as C,json,struct,subprocess,math
from PIL import Image,ImageDraw
import render_gles as g
script="""import {buildConnectedProxy} from './character-prototype/preview/connected-proxy.mjs';
import {buildBackChart} from './character-prototype/preview/material-chart.mjs';
const m=buildConnectedProxy();console.log(JSON.stringify(buildBackChart(m)));"""
mapping=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=g.ROOT,text=True))
vertex='''precision highp float;
attribute vec3 a_position;attribute vec2 a_uv;attribute float a_candidate;
uniform float u_yaw;varying vec2 v_uv;varying float v_candidate;
void main(){float c=cos(u_yaw),s=sin(u_yaw);vec3 p=vec3(c*a_position.x+s*a_position.z,a_position.y,-s*a_position.x+c*a_position.z);
float w=(2300.0-p.z)/2300.0;vec2 q=p.xy/w+vec2(790.0,1110.0);
v_uv=a_uv;v_candidate=a_candidate;
gl_Position=vec4((q*vec2(2.0/1600.0,-2.0/1740.0)+vec2(-.72,.92))*w,-p.z/1000.0*w,w);}'''
fragment='''precision highp float;uniform sampler2D u_source;uniform float u_mask;
varying vec2 v_uv;varying float v_candidate;
void main(){vec3 color=vec3(.6,.12,.43);if(v_candidate>.999){color=texture2D(u_source,v_uv).rgb;if(u_mask>.5)color=vec3(0,1,1);}gl_FragColor=vec4(color,1);}'''
p=g.createProgram()
for text,kind in [(vertex,0x8B31),(fragment,0x8B30)]:
 s=g.createShader(kind);raw=C.c_char_p(text.encode());g.shaderSource(s,1,C.byref(raw),None);g.compileShader(s);ok=g.I();g.getShader(s,0x8B81,C.byref(ok));assert ok.value;g.attach(p,s)
g.link(p);ok=g.I();g.getProgram(p,0x8B82,C.byref(ok));assert ok.value;g.use(p)
for i in range(8):g.disableAttr(i)
for name,width,data in [('position',3,(g.assets/'scene_positions.bin').read_bytes()),('uv',2,struct.pack('<'+'f'*len(mapping['uv']),*mapping['uv'])),('candidate',1,struct.pack('<'+'f'*len(mapping['candidate']),*mapping['candidate']))]:
 loc=g.getAttrib(p,('a_'+name).encode());g.buffer(data);g.enableAttr(loc);g.attrPointer(loc,width,0x1406,0,0,None)
data=(g.assets/'scene_indices.bin').read_bytes();index=g.U();g.genBuffer(1,C.byref(index));g.bindBuffer(0x8893,index);g.bufferData(0x8893,len(data),data,0x88E4)
texture=g.U();g.genTexture(1,C.byref(texture));g.activeTexture(0x84C0);g.bindTexture(0x0DE1,texture)
for param in [0x2801,0x2800]:g.texParam(0x0DE1,param,0x2601)
for param in [0x2802,0x2803]:g.texParam(0x0DE1,param,0x812F)
im=Image.open(g.ROOT/mapping['chart']['source']).convert('RGBA');g.texImage(0x0DE1,0,0x1908,*im.size,0,0x1908,0x1401,im.tobytes());g.uniform1i(g.getUniform(p,b'u_source'),0)
draw=g.gl('glDrawElements',None,g.U,g.I,g.U,g.P);front=g.gl('glFrontFace',None,g.U);front(0x0900)
g.enable(0x0B44);g.enable(0x0B71);g.depthFunc(0x0201);g.disable(0x0BE2)
angles=[0,.8,1.6,2.4,math.pi];counts=[];canvas=Image.new('RGB',(1350,618),(18,24,32));d=ImageDraw.Draw(canvas)
for col,angle in enumerate(angles):
 g.uniform1f(g.getUniform(p,b'u_yaw'),angle)
 for mask in [0,1]:
  g.uniform1f(g.getUniform(p,b'u_mask'),mask);g.clearColor(.07,.09,.125,1);g.clear(0x4000|0x0100);draw(4,len(data)//2,0x1403,None);g.finish();assert g.error()==0
  raw=(C.c_ubyte*(g.W*g.H*4))();g.readPixels(0,0,g.W,g.H,0x1908,0x1401,raw)
  rendered=Image.frombytes('RGBA',(g.W,g.H),bytes(raw)).transpose(Image.Transpose.FLIP_TOP_BOTTOM).convert('RGB')
  if not mask:
   canvas.paste(rendered.resize((270,588)),(col*270,30));d.text((col*270+6,8),f'UNREGISTERED patch yaw{angle:.2f}',fill='white')
  else:counts.append(sum(r<10 and green>245 and b>245 for r,green,b in rendered.get_flattened_data()))
assert counts[0]==0 and max(counts)>5000,counts
canvas.save(g.ROOT/'validation/s2-back-chart-gles.jpg',quality=91)
result={'renderer':g.getString(0x1F01).decode(),'source':mapping['chart']['source'],'yawRadians':angles,'visibleCandidateSourcePixels':counts,'rearPatchHiddenAtNeutral':True,'depthTested':True,'wholeImageCrossfade':False,'uvAttachedToSurface':True,'cameraCalibrated':False,'productionConfidence':0,'debugOnly':True,'phoneTested':False}
(g.ROOT/'validation/s2-back-chart-gles.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

"""Actual GLES shared-component deformation. Donor view, not main registration."""
import ctypes as C,json,os,subprocess,struct
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
import render_gles as g
subprocess.run(['node','tests/component-deform-regression.mjs'],cwd=g.ROOT,check=True)
mesh=json.loads(Path('/tmp/f14-component-warp.json').read_text());parts=json.loads((g.ROOT/'references/derived/side-b-cutout-manifest.json').read_text())['components']
p=g.createProgram()
vs=b'attribute vec2 a_position,a_uv; varying vec2 v_uv; void main(){ v_uv=a_uv; gl_Position=vec4((a_position-vec2(640.,295.))/vec2(330.,360.)*vec2(2.,-2.)+vec2(-1.,1.),0.,1.); }'
frag=b'precision mediump float; varying vec2 v_uv; uniform sampler2D u_image; void main(){gl_FragColor=texture2D(u_image,v_uv);}'
for src,kind in [(vs,0x8B31),(frag,0x8B30)]:
 s=g.createShader(kind);raw=C.c_char_p(src);g.shaderSource(s,1,C.byref(raw),None);g.compileShader(s);ok=g.I();g.getShader(s,0x8B81,C.byref(ok));assert ok.value;g.attach(p,s)
g.link(p);ok=g.I();g.getProgram(p,0x8B82,C.byref(ok));assert ok.value;g.use(p)
g.viewport(0,0,540,588);g.disable(0x0B71);g.enable(0x0BE2);g.blend(1,0x0303);g.activeTexture(0x84C0);g.uniform1i(g.getUniform(p,b'u_image'),0)
textures=[]
for part in parts:
 t=g.U();g.genTexture(1,C.byref(t));g.bindTexture(0x0DE1,t)
 for a in [0x2800,0x2801]:g.texParam(0x0DE1,a,0x2601)
 for a in [0x2802,0x2803]:g.texParam(0x0DE1,a,0x812F)
 im=Image.open(g.ROOT/part['path']).convert('RGBA');data=np.array(im,dtype=np.uint16);data[:,:,:3]=(data[:,:,:3]*data[:,:,3:4]+127)//255
 g.texImage(0x0DE1,0,0x1908,*im.size,0,0x1908,0x1401,data.astype(np.uint8).tobytes());textures.append(t)
frames=[]
for field in ['sourcePositions','targetSourcePositions']:
 g.clearColor(.05,.075,.115,1);g.clear(0x4000)
 for material in range(len(parts)):
  data=[]
  for i,id in enumerate(mesh['indices']):
   if mesh['triangleGroups'][i//3]==material:data.extend(mesh[field][id*2:id*2+2]+mesh['cornerUv'][i*2:i*2+2])
  buffer=g.buffer(struct.pack('<'+'f'*len(data),*data));g.bindTexture(0x0DE1,textures[material]);g.bindBuffer(0x8892,buffer)
  for name,offset in [('position',0),('uv',8)]:
   loc=g.getAttrib(p,('a_'+name).encode());g.enableAttr(loc);g.attrPointer(loc,2,0x1406,0,16,C.c_void_p(offset))
  g.drawArrays(4,0,len(data)//4)
 g.finish();assert g.error()==0;raw=(C.c_ubyte*(540*588*4))();g.readPixels(0,0,540,588,0x1908,0x1401,raw);frames.append(Image.frombytes('RGBA',(540,588),bytes(raw)).transpose(Image.Transpose.FLIP_TOP_BOTTOM).convert('RGB'))
out=Image.new('RGB',(1080,618),(18,24,32));d=ImageDraw.Draw(out)
for i,(label,im) in enumerate(zip(['Same donor shared rest topology','Shared MLS gain55%, UV unchanged'],frames)):out.paste(im,(i*540,30));d.text((i*540+10,8),label,fill='white')
out.save(g.ROOT/'validation/f14-component-deform-gles.jpg',quality=92)
(g.ROOT/'validation/f14-component-deform-gles.json').write_text(json.dumps({'renderer':g.getString(0x1F01).decode(),'actualGles':True,'image':'validation/f14-component-deform-gles.jpg','gain':.55,'sameDonorOnly':True,'registeredToMain':False,'visualSeamAcceptance':False,'phoneTested':False},indent=2)+'\n');print('Actual GLES shared donor junction rendered; no main/phone acceptance')

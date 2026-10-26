"""GLES neutral photo preservation across triangles with different world depth."""
import ctypes as C,json,struct,subprocess
import numpy as np
from PIL import Image,ImageDraw
import render_gles as g
script="""import {buildObservedScene} from './character-prototype/preview/observed-scene.mjs';import {poseUniforms} from './character-prototype/preview/structural-pose.mjs';console.log(JSON.stringify({scene:buildObservedScene(),bones:poseUniforms().map(x=>Array.from(x))}));"""
data=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=g.ROOT,text=True))
p=g.createProgram()
for file,kind in [('observed-surface.vert',0x8B31),('observed-surface.frag',0x8B30)]:
 text=(g.ROOT/'character-prototype/preview'/file).read_bytes();s=g.createShader(kind);raw=C.c_char_p(text);g.shaderSource(s,1,C.byref(raw),None);g.compileShader(s);ok=g.I();g.getShader(s,0x8B81,C.byref(ok));assert ok.value;g.attach(p,s)
g.link(p);ok=g.I();g.getProgram(p,0x8B82,C.byref(ok));assert ok.value;g.use(p)
matrix=g.gl('glUniformMatrix4fv',None,g.I,g.I,C.c_ubyte,C.POINTER(g.F));matrix(g.getUniform(p,b'u_bones[0]'),6,0,(g.F*96)(*sum(data['bones'],[])))
g.uniform1i(g.getUniform(p,b'u_source'),0);g.uniform1i(g.getUniform(p,b'u_mask'),1);g.activeTexture(0x84C0);g.bindTexture(0x0DE1,g.textures['original.png']);g.activeTexture(0x84C1);g.bindTexture(0x0DE1,g.textures['mask.png'])
g.enable(0x0BE2);g.blend(0x0302,0x0303);g.enable(0x0B71);g.depthFunc(0x0201);g.disable(0x0B44)
buffers={}
for flat in [False,True]:
 for s in [data['scene']['body'],data['scene']['paper']]:
  positions=s['positions']
  if flat:positions=[n for i in range(s['vertices']) for n in [(s['uv'][i*2]*1152-790),(s['uv'][i*2+1]*1536-1110),0]]
  attrs=[]
  for name,values,width,stride,offset in [('position',positions,3,0,0),('uv',s['uv'],2,0,0),('weights0',s['skinWeights'],4,24,0),('weights1',s['skinWeights'],2,24,16),('support',s['supportWeights'],1,0,0)]:
   b=g.buffer(struct.pack('<'+'f'*len(values),*values));attrs.append((g.getAttrib(p,('a_'+name).encode()),b,width,stride,offset))
  buffers[(flat,s['paper'])]=(attrs,s['vertices'])
def render(flat=False,camera=(0,0)):
 g.use(p);g.uniform2f(g.getUniform(p,b'u_camera'),*camera);g.clearColor(.05,.075,.115,1);g.clear(0x4000|0x0100)
 for paper in [False,True]:
  for i in range(8):g.disableAttr(i)
  attrs,V=buffers[(flat,paper)]
  for loc,b,width,stride,offset in attrs:g.bindBuffer(0x8892,b);g.enableAttr(loc);g.attrPointer(loc,width,0x1406,0,stride,C.c_void_p(offset))
  g.uniform1f(g.getUniform(p,b'u_masked'),0 if paper else 1);g.drawArrays(4,0,V)
 g.finish();assert g.error()==0;raw=(C.c_ubyte*(g.W*g.H*4))();g.readPixels(0,0,g.W,g.H,0x1908,0x1401,raw)
 return Image.frombytes('RGBA',(g.W,g.H),bytes(raw)).transpose(Image.Transpose.FLIP_TOP_BOTTOM).convert('RGB')
neutral=render();flat=render(True);diff=np.abs(np.asarray(neutral,dtype=float)-np.asarray(flat,dtype=float));mean=float(diff.mean());changed=int(np.count_nonzero(np.max(diff,axis=2)>2));assert mean<.03 and changed<100,(mean,changed)
canvas=Image.new('RGB',(1080,618),(18,24,32));d=ImageDraw.Draw(canvas)
for i,(label,im) in enumerate([('source flat reference',flat),('observed3D neutral',neutral),('observed yaw+0.4',render(camera=(.4,0))),('observed yaw-0.4',render(camera=(-.4,0)))]):canvas.paste(im.resize((270,588)),(i*270,30));d.text((i*270+5,8),label,fill='white')
canvas.save(g.ROOT/'validation/s2-observed-scene-gles.jpg',quality=91)
result={'renderer':g.getString(0x1F01).decode(),'neutralMeanRgbDifferenceFromFlatSource':mean,'neutralPixelsDifferenceOver2':changed,'perspectiveCorrectSourceUv':True,'observedBodyAndPaperWorldScene':True,'rearProxyIncludedInThisCheck':False,'frontRearSeamAccepted':False,'productionUsed':False,'phoneTested':False}
(g.ROOT/'validation/s2-observed-scene-gles.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

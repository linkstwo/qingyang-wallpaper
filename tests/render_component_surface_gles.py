"""Observed local donor surface with inferred depth; not main/body acceptance."""
import ctypes as C,json,struct,subprocess,math
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
import render_gles as g
subprocess.run(['node','tests/component-surface-regression.mjs'],cwd=g.ROOT,check=True)
mesh=json.loads(Path('/tmp/f14-component-surface.json').read_text());parts=json.loads((g.ROOT/'references/derived/near-down-cutout-manifest.json').read_text())['components']
vs,frag,crop=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {componentSurfaceVertexShader as v,componentSurfaceFragmentShader as f} from './character-prototype/preview/component-surface-shaders.mjs';import {fitComponentCrop} from './character-prototype/preview/component-raster.mjs';console.log(JSON.stringify([v,f,fitComponentCrop([790,380,240,660],540,588)]));"],cwd=g.ROOT,text=True))
p=g.createProgram()
for src,kind in [(vs,0x8B31),(frag,0x8B30)]:
 s=g.createShader(kind);raw=C.c_char_p(src.encode());g.shaderSource(s,1,C.byref(raw),None);g.compileShader(s);ok=g.I();g.getShader(s,0x8B81,C.byref(ok));assert ok.value;g.attach(p,s)
g.link(p);ok=g.I();g.getProgram(p,0x8B82,C.byref(ok));assert ok.value;g.use(p)
g.gl('glUniform4f',None,g.I,g.F,g.F,g.F,g.F)(g.getUniform(p,b'u_crop'),*crop);g.uniform2f(g.getUniform(p,b'u_pivot'),*mesh['surfaceProfile']['pivot']);g.uniform1f(g.getUniform(p,b'u_distance'),mesh['surfaceProfile']['cameraDistance']);g.uniform1i(g.getUniform(p,b'u_image'),0)
g.viewport(0,0,540,588);g.disable(0x0B71);g.disable(0x0BE2);g.enable(0x0B44);g.gl('glFrontFace',None,g.U)(0x0900);g.activeTexture(0x84C0)
batches=[]
for material,part in enumerate(parts):
 t=g.U();g.genTexture(1,C.byref(t));g.bindTexture(0x0DE1,t)
 for a in [0x2800,0x2801]:g.texParam(0x0DE1,a,0x2601)
 for a in [0x2802,0x2803]:g.texParam(0x0DE1,a,0x812F)
 im=Image.open(g.ROOT/part['path']).convert('RGBA');g.texImage(0x0DE1,0,0x1908,*im.size,0,0x1908,0x1401,im.tobytes());data=[]
 for i,id in enumerate(mesh['indices']):
  if mesh['triangleGroups'][i//3]==material:data.extend(mesh['positions'][id*3:id*3+3]+mesh['cornerUv'][i*2:i*2+2]+[mesh['restW'][id]])
 b=g.buffer(struct.pack('<'+'f'*len(data),*data));batches.append((t,b,len(data)//6))
frames=[]
for degrees in [-20,-2.2918,0,2.2918,20]:
 g.uniform2f(g.getUniform(p,b'u_camera'),math.radians(degrees),0);g.clearColor(.05,.075,.115,1);g.clear(0x4000)
 for t,b,V in batches:
  g.bindTexture(0x0DE1,t);g.bindBuffer(0x8892,b)
  for name,width,offset in [('position',3,0),('uv',2,12),('restW',1,20)]:
   loc=g.getAttrib(p,('a_'+name).encode());g.enableAttr(loc);g.attrPointer(loc,width,0x1406,0,24,C.c_void_p(offset))
  g.drawArrays(4,0,V)
 g.finish();assert g.error()==0;raw=(C.c_ubyte*(540*588*4))();g.readPixels(0,0,540,588,0x1908,0x1401,raw);im=Image.frombytes('RGBA',(540,588),bytes(raw)).transpose(Image.Transpose.FLIP_TOP_BOTTOM).convert('RGB');assert (np.array(im)[:,:,0]>50).sum()>2000;frames.append(im)
canvas=Image.new('RGB',(2700,618),(18,24,32));d=ImageDraw.Draw(canvas)
for i,(angle,im) in enumerate(zip([-20,-2.2918,0,2.2918,20],frames)):canvas.paste(im,(i*540,30));d.text((i*540+8,8),f'inferred local surface / yaw {angle}',fill='white')
canvas.save(g.ROOT/'validation/f14-component-surface-gles.jpg',quality=92)
# Independent planar baseline from actual shared-component renderer at rest.
subprocess.run(['python','tests/render_component_junction_gles.py'],cwd=g.ROOT,env={**__import__('os').environ,'COMPONENT_DONOR':'nearDown','COMPONENT_RAW_TAG':'surface-planar-baseline'},check=True)
old=np.array(Image.open('/tmp/f14-components-surface-planar-baseline-0.png')).astype(int);neutral=np.array(frames[2]).astype(int);mask=(old[:,:,0]>50)&(neutral[:,:,0]>50);inside=mask.copy()
for dy,dx in [(-1,0),(1,0),(0,-1),(0,1)]:inside&=np.roll(mask,(dy,dx),(0,1))
delta=np.abs(neutral-old);maxError=int(delta[inside].max());assert maxError<=3,('neutral source sampling differs from flat source',maxError)
result={'renderer':g.getString(0x1F01).decode(),'actualGles':True,'neutralPlanarMaxChannelError':maxError,'neutralInteriorPixels':int(inside.sum()),'depthInferred':True,'hiddenTextureAdded':False,'registeredToMain':False,'cameraCalibrated':False,'wholeT04Accepted':False,'phoneTested':False}
(g.ROOT/'validation/f14-component-surface-gles.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

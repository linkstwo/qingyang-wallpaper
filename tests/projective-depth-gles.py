"""A world plane must keep the same raster depth when its tessellation changes.

Exercises production GLSL; old quadratic clipZ is a required failing control.
"""
import ctypes as C,json,struct
import numpy as np
import render_gles as g
source=(g.assets/'scene.vert').read_text()
fragment='''precision highp float;void main(){highp float value=gl_FragCoord.z;float n=floor(value*16777215.0+.5);float r=floor(n/65536.0),v=floor((n-r*65536.0)/256.0),b=n-r*65536.0-v*256.0;gl_FragColor=vec4(r,v,b,255.0)/255.0;}'''
def program(vertex):
 p=g.createProgram()
 for text,kind in [(vertex,0x8B31),(fragment,0x8B30)]:
  s=g.createShader(kind);raw=C.c_char_p(text.encode());g.shaderSource(s,1,C.byref(raw),None);g.compileShader(s);ok=g.I();g.getShader(s,0x8B81,C.byref(ok));assert ok.value;g.attach(p,s)
 g.link(p);ok=g.I();g.getProgram(p,0x8B82,C.byref(ok));assert ok.value;return p
old=source.replace('(4250.0-14.0*sceneDepth)/17250.0','-sceneDepth/1000.0*clipW');assert old!=source
programs={'correct':program(source),'old_quadratic':program(old)}
def mesh(xs,ys):
 values=[]
 for a,b in zip(xs,xs[1:]):
  for c,d in zip(ys,ys[1:]):values.extend([a,c,b,c,a,d,a,d,b,c,b,d])
 return values
meshes={k:v for k,v in [('coarse',mesh([100,1100],[400,1250])),('fine',mesh(list(range(100,1101,50)),[*range(400,1250,50),1250]))]}
buffers={name:g.buffer(struct.pack('<'+'f'*len(values),*values)) for name,values in meshes.items()}
g.disable(0x0BE2);g.disable(0x0B71);g.disable(0x0B44);g.disable(0x0BD0)
def render(p,name,view):
 g.use(p)
 for i in range(8):g.disableAttr(i)
 loc=lambda n:g.getUniform(p,('u_'+n).encode())
 g.uniform1f(loc('layer'),3);g.uniform1f(loc('structureMode'),1);g.uniform2f(loc('view'),*view);g.uniform2f(loc('ndcScale'),2/1200,-2/1600);g.uniform2f(loc('ndcOffset'),-1,1)
 a=g.getAttrib(p,b'a_source');g.bindBuffer(0x8892,buffers[name]);g.enableAttr(a);g.attrPointer(a,2,0x1406,0,0,None)
 for attribute_name in ['a_pin','a_depth']:
  attr=g.getAttrib(p,attribute_name.encode())
  if attr>=0:g.constantAttr(attr,0)
 g.clearColor(0,0,0,0);g.clear(0x4000)
results={};global_new=0;global_old=0
for kind,p in programs.items():
 cases=[]
 for view in [(-1,-1),(0,0),(1,1)]:
  frames=[]
  for name in ['coarse','fine']:
   render(p,name,view);g.drawArrays(4,0,len(meshes[name])//2);g.finish();assert g.error()==0
   raw=(C.c_ubyte*(g.W*g.H*4))();g.readPixels(0,0,g.W,g.H,0x1908,0x1401,raw);im=np.frombuffer(raw,dtype=np.uint8).reshape(g.H,g.W,4).astype(np.int64);frames.append(im)
  valid=(frames[0][:,:,0]>32)&(frames[0][:,:,0]<224)&(frames[1][:,:,0]>32)&(frames[1][:,:,0]<224)
  # Remove the silhouette, whose coverage can differ by a subpixel raster roundoff.
  for _ in range(2):valid=valid&np.roll(valid,1,0)&np.roll(valid,-1,0)&np.roll(valid,1,1)&np.roll(valid,-1,1)
  depth=lambda im:(im[:,:,0]*65536+im[:,:,1]*256+im[:,:,2])/16777215
  error=np.abs(depth(frames[0])-depth(frames[1]))[valid];assert len(error)>100000
  worst=float(error.max());cases.append({'view':view,'pixels':len(error),'maxWindowDepthError':worst,'meanWindowDepthError':float(error.mean())})
  if kind=='correct':global_new=max(global_new,worst)
  else:global_old=max(global_old,worst)
 results[kind]=cases
assert global_new<2e-6,global_new
assert global_old>1e-5 and global_old>global_new*20,(global_old,global_new)
result={'renderer':g.getString(0x1F01).decode(),'cases':results,'maxCorrectWindowDepthError':global_new,'maxOldWindowDepthError':global_old,'oldQuadraticRejected':True,'worldNearZ':1000,'worldFarZ':-2000,'phoneTested':False}
(g.ROOT/'validation/s2-projective-depth.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

"""Render production GLSL/assets on a surfaceless EGL pbuffer. Not a phone test."""
from pathlib import Path
import ctypes as C
import json, math, os
from PIL import Image, ImageChops, ImageStat
os.environ.setdefault('EGL_PLATFORM','surfaceless')
os.environ.setdefault('LIBGL_ALWAYS_SOFTWARE','1')
ROOT=Path(__file__).resolve().parents[1]
E=C.CDLL('libEGL.so.1'); I=C.c_int; U=C.c_uint; F=C.c_float; P=C.c_void_p
for name,restype,args in [
 ('eglGetDisplay',P,[P]),('eglInitialize',U,[P,C.POINTER(I),C.POINTER(I)]),
 ('eglBindAPI',U,[U]),('eglChooseConfig',U,[P,C.POINTER(I),C.POINTER(P),I,C.POINTER(I)]),
 ('eglCreateContext',P,[P,P,P,C.POINTER(I)]),('eglCreatePbufferSurface',P,[P,P,C.POINTER(I)]),
 ('eglMakeCurrent',U,[P,P,P,P]),('eglGetProcAddress',P,[C.c_char_p]),
 ('eglDestroySurface',U,[P,P]),('eglDestroyContext',U,[P,P]),('eglTerminate',U,[P])]:
 fn=getattr(E,name);fn.restype=restype;fn.argtypes=args
attrs=lambda *v:(I*len(v))(*v)
display=E.eglGetDisplay(None);major=I();minor=I()
assert E.eglInitialize(display,C.byref(major),C.byref(minor)), 'EGL initialization'
assert E.eglBindAPI(0x30A0)
config=P();count=I()
assert E.eglChooseConfig(display,attrs(0x3040,4,0x3033,1,0x3024,8,0x3023,8,0x3022,8,0x3038),C.byref(config),1,C.byref(count)) and count.value
W,H=540,1200
context=E.eglCreateContext(display,config,None,attrs(0x3098,2,0x3038))
surface=E.eglCreatePbufferSurface(display,config,attrs(0x3057,W,0x3056,H,0x3038))
assert context and surface and E.eglMakeCurrent(display,surface,surface,context)
def gl(name,rt,*args):
 address=E.eglGetProcAddress(name.encode());assert address,name
 return C.CFUNCTYPE(rt,*args)(address)
createShader=gl('glCreateShader',U,U);shaderSource=gl('glShaderSource',None,U,I,C.POINTER(C.c_char_p),C.POINTER(I));compileShader=gl('glCompileShader',None,U)
getShader=gl('glGetShaderiv',None,U,U,C.POINTER(I));shaderLog=gl('glGetShaderInfoLog',None,U,I,C.POINTER(I),C.c_char_p)
createProgram=gl('glCreateProgram',U);attach=gl('glAttachShader',None,U,U);link=gl('glLinkProgram',None,U);getProgram=gl('glGetProgramiv',None,U,U,C.POINTER(I));use=gl('glUseProgram',None,U)
getUniform=gl('glGetUniformLocation',I,U,C.c_char_p);uniform1f=gl('glUniform1f',None,I,F);uniform1i=gl('glUniform1i',None,I,I);uniform2f=gl('glUniform2f',None,I,F,F)
getAttrib=gl('glGetAttribLocation',I,U,C.c_char_p);enableAttr=gl('glEnableVertexAttribArray',None,U);disableAttr=gl('glDisableVertexAttribArray',None,U);constantAttr=gl('glVertexAttrib1f',None,U,F)
attrPointer=gl('glVertexAttribPointer',None,U,I,U,C.c_ubyte,I,P)
genBuffer=gl('glGenBuffers',None,I,C.POINTER(U));bindBuffer=gl('glBindBuffer',None,U,U);bufferData=gl('glBufferData',None,U,C.c_ssize_t,P,U)
genTexture=gl('glGenTextures',None,I,C.POINTER(U));bindTexture=gl('glBindTexture',None,U,U);activeTexture=gl('glActiveTexture',None,U);texParam=gl('glTexParameteri',None,U,U,I)
texImage=gl('glTexImage2D',None,U,I,I,I,I,I,U,U,P)
viewport=gl('glViewport',None,I,I,I,I);enable=gl('glEnable',None,U);blend=gl('glBlendFunc',None,U,U);clearColor=gl('glClearColor',None,F,F,F,F);clear=gl('glClear',None,U);drawArrays=gl('glDrawArrays',None,U,I,I)
readPixels=gl('glReadPixels',None,I,I,I,I,U,U,P);error=gl('glGetError',U);finish=gl('glFinish',None)
getString=gl('glGetString',C.c_char_p,U)
program=createProgram()
assets=ROOT/'android-app/app/src/main/assets'
for filename,kind in [('scene.vert',0x8B31),('scene.frag',0x8B30)]:
 text=(assets/filename).read_bytes();shader=createShader(kind);source=C.c_char_p(text)
 shaderSource(shader,1,C.byref(source),None);compileShader(shader);ok=I();getShader(shader,0x8B81,C.byref(ok))
 if not ok.value:
  log=C.create_string_buffer(8192);shaderLog(shader,8192,None,log);raise AssertionError(log.value)
 attach(program,shader)
link(program);ok=I();getProgram(program,0x8B82,C.byref(ok));assert ok.value,'shader link'
use(program)
locations={name:getUniform(program,('u_'+name).encode()) for name in ['size','view','body','chest','hair','ndcScale','ndcOffset','layer','motionGain','tipMode','maskMode','cover','softFrame','texture','mask']}
a=getAttrib(program,b'a_source');pin=getAttrib(program,b'a_pin')
def u(name,*values):
 location=locations[name]
 if len(values)==2:uniform2f(location,*values)
 else:uniform1f(location,values[0])
u('size',1086,1448);uniform1i(locations['texture'],0);uniform1i(locations['mask'],1)
textures={}
for name in ['original.png','background.png','mask.png']:
 texture=U();genTexture(1,C.byref(texture));bindTexture(0x0DE1,texture)
 for param in [0x2801,0x2800]:texParam(0x0DE1,param,0x2601)
 for param in [0x2802,0x2803]:texParam(0x0DE1,param,0x812F)
 im=Image.open(assets/name).convert('RGBA');data=im.tobytes();texImage(0x0DE1,0,0x1908,*im.size,0,0x1908,0x1401,data);textures[name]=texture
activeTexture(0x84C1);bindTexture(0x0DE1,textures['mask.png']);activeTexture(0x84C0)
def buffer(data):
 ident=U();genBuffer(1,C.byref(ident));bindBuffer(0x8892,ident);bufferData(0x8892,len(data),data,0x88E4);return ident
quad_values=[0,0,1086,0,0,1448,0,1448,1086,0,1086,1448]
quad_raw=bytes((F*len(quad_values))(*quad_values));quad=buffer(quad_raw)
mesh_raw=(assets/'character_mesh.bin').read_bytes();mesh=buffer(mesh_raw);pins=buffer((assets/'character_pins.bin').read_bytes());fg_raw=(assets/'foreground_mesh.bin').read_bytes();fg=buffer(fg_raw)
viewport(0,0,W,H);enable(0x0BE2);blend(0x0302,0x0303);enableAttr(a)
def frame(wider,size_percent=90):
 cover=max(W/1086,H/1448);scale=min(cover,W/1086*size_percent/100) if wider else cover
 x=W*.5-590*scale if wider else (W-1086*scale)*.5
 y=min(0,(H-1448*scale)*.5) if wider else (H-1448*scale)*.5
 return scale,x,y,min(1.45,cover/scale)
def transform(mapping):
 scale,x,y,gain=mapping;u('ndcScale',2*scale/W,-2*scale/H);u('ndcOffset',2*x/W-1,1-2*y/H)
def layer(b,count,texture,number,mask_mode,pinned=False):
 u('layer',number);u('maskMode',mask_mode);bindTexture(0x0DE1,textures[texture])
 if pinned:
  enableAttr(pin);bindBuffer(0x8892,pins);attrPointer(pin,1,0x1406,0,0,None)
 else:disableAttr(pin);constantAttr(pin,0)
 bindBuffer(0x8892,b);attrPointer(a,2,0x1406,0,0,None);drawArrays(4,0,count)
def render(wider=True,view=(0,0),body=(0,0),chest=(0,0),hair=(0,0),enhanced=True,fill_override=None):
 mapping=frame(wider);u('view',*view);u('body',*body);u('chest',*chest);u('hair',*hair);u('motionGain',mapping[3]);u('tipMode',int(enhanced));u('softFrame',int(wider))
 u('cover',1 if fill_override is None else fill_override)
 clearColor(.06,.09,.12,1);clear(0x4000)
 if wider:
  transform(frame(False));layer(quad,6,'background.png',-1,0)
 transform(mapping);layer(quad,6,'original.png',0,0);layer(quad,6,'background.png',0,2);layer(mesh,len(mesh_raw)//8,'original.png',1,1,True);layer(fg,len(fg_raw)//8,'original.png',3,0)
 finish();assert error()==0,'GPU draw error'
 pixels=(C.c_ubyte*(W*H*4))();readPixels(0,0,W,H,0x1908,0x1401,pixels)
 return Image.frombytes('RGBA',(W,H),bytes(pixels)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
if __name__=='__main__':
 output=ROOT/'validation';output.mkdir(exist_ok=True)
 neutral=render();neutral.save(output/'framing-wide.png');render(False).save(output/'framing-close.png')
 tilt=render(view=(.72,-.3));tilt.save(output/'cloud-tilt.png')
 hair=render(hair=(18,7));hair.save(output/'cloud-hair.png')
 def region_diff(a,b,box):
  k,x,y,_=frame(True);x1,y1,x2,y2=box
  box=(int(x+x1*k),int(y+y1*k),int(x+x2*k),int(y+y2*k))
  return sum(ImageStat.Stat(ImageChops.difference(a.crop(box).convert('RGB'),b.crop(box).convert('RGB'))).mean)/3
 covered=render(fill_override=1)
 face=region_diff(covered,hair,(365,300,450,380));contact=region_diff(covered,hair,(250,910,280,940));tip=region_diff(covered,hair,(200,390,270,490))
 assert face<.3,('face moved with hair',face)
 assert contact<.3,('contact moved with hair',contact)
 assert tip>.5,('no visible strand movement',tip)
 result={'renderer':getString(0x1F01).decode(),'gles':getString(0x1F02).decode(),'faceMeanRgbChange':face,'contactMeanRgbChange':contact,'hairTipMeanRgbChange':tip,'phoneTested':False}
 (output/'cloud-render.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
 E.eglMakeCurrent(display,None,None,None);E.eglDestroySurface(display,surface);E.eglDestroyContext(display,context);E.eglTerminate(display)

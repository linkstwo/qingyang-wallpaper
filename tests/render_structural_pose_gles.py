"""Exercise exported skin/support bytes in GLES2; compare world vertices to JS CPU.

Point probes replace only the last projection, after skinPoint(). Mesh views use
the unchanged shader. This is Mesa/offline evidence, never Android phone evidence.
"""
import ctypes as C
import json, math, struct, subprocess
from PIL import Image, ImageDraw
import render_gles as g

root=g.ROOT
source=(root/'character-prototype/preview/structural-skin.vert').read_text()
def program(vertex,fragment):
 p=g.createProgram()
 for text,kind in [(vertex,0x8B31),(fragment,0x8B30)]:
  s=g.createShader(kind);raw=C.c_char_p(text.encode());g.shaderSource(s,1,C.byref(raw),None);g.compileShader(s)
  ok=g.I();g.getShader(s,0x8B81,C.byref(ok))
  if not ok.value:
   log=C.create_string_buffer(8192);g.shaderLog(s,8192,None,log);raise AssertionError(log.value)
  g.attach(p,s)
 g.link(p);ok=g.I();g.getProgram(p,0x8B82,C.byref(ok));assert ok.value,'skin shader link'
 return p

matrix=g.gl('glUniformMatrix4fv',None,g.I,g.I,C.c_ubyte,C.POINTER(g.F))
draw=g.gl('glDrawElements',None,g.U,g.I,g.U,g.P)
front=g.gl('glFrontFace',None,g.U)
report=json.loads((g.assets/'scene-report.json').read_text());V=report['vertices']
assert report['version']==3
positions=list(struct.unpack('<'+'f'*(V*3),(g.assets/'scene_positions.bin').read_bytes()))
indices=list(struct.unpack('<'+'H'*(report['triangles']*3),(g.assets/'scene_indices.bin').read_bytes()))
def bind(p,posed_normals=None):
 g.use(p)
 for i in range(8):g.disableAttr(i)
 for name,file,width,stride,offset in [
  ('position','scene_positions.bin',3,0,0),('normal','scene_normals.bin',3,0,0),
  ('weights0','scene_skin.bin',4,24,0),('weights1','scene_skin.bin',2,24,16),
  ('support','scene_support.bin',1,0,0),('region','scene_regions.bin',1,0,0)]:
  loc=g.getAttrib(p,('a_'+name).encode())
  if loc<0:continue
  data=posed_normals if name=='normal' and posed_normals else (g.assets/file).read_bytes()
  g.buffer(data);g.enableAttr(loc);g.attrPointer(loc,width,0x1406,0,stride,C.c_void_p(offset))
def set_pose(p,matrices,camera=(0,0),mode=0):
 vals=[x for m in matrices for x in m];matrix(g.getUniform(p,b'u_bones[0]'),6,0,(g.F*96)(*vals))
 g.uniform2f(g.getUniform(p,b'u_camera'),*camera);g.uniform1f(g.getUniform(p,b'u_mode'),mode)

# JS expectation starts from the original model. GPU reads independently exported f32.
script="""import {buildConnectedProxy} from './character-prototype/preview/connected-proxy.mjs';
import {poseConnectedProxy,poseUniforms} from './character-prototype/preview/structural-pose.mjs';
const m=buildConnectedProxy(),out=[];
for(const yaw of [-.06,0,.06])for(const pitch of [-.04,0,.04])for(const roll of [-.035,0,.035]){
 const input={yaw,pitch,roll},q=poseConnectedProxy(m,input);
 out.push({input,positions:q.positions,matrices:poseUniforms(input).map(a=>Array.from(a))});}
console.log(JSON.stringify(out));"""
cases=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=root,text=True))
head='attribute vec2 a_probe;uniform float u_axis;varying float v_probe;\n'
probe=source.replace('void main(){',head+'void main(){')
last=probe.index(' gl_Position=')
probe=probe[:last]+''' v_probe=(dot(world,u_axis<.5?vec3(1,0,0):(u_axis<1.5?vec3(0,1,0):vec3(0,0,1)))+2048.0)/4096.0;
 gl_Position=vec4(a_probe,0,1);gl_PointSize=1.0;
}'''
frag='''precision highp float;varying float v_probe;
void main(){float n=floor(v_probe*16777215.0+.5);float r=floor(n/65536.0),g=floor((n-r*65536.0)/256.0),b=n-r*65536.0-g*256.0;gl_FragColor=vec4(r,g,b,255.0)/255.0;}'''
p=program(probe,frag);bind(p)
PW=256;PH=math.ceil(V/PW)
coords=[n for i in range(V) for n in [2*((i%PW)+.5)/PW-1,2*((i//PW)+.5)/PH-1]]
g.buffer(struct.pack('<'+'f'*len(coords),*coords));loc=g.getAttrib(p,b'a_probe');g.enableAttr(loc);g.attrPointer(loc,2,0x1406,0,0,None)
g.viewport(0,0,PW,PH);g.disable(0x0BE2);g.disable(0x0B71);g.disable(0x0B44)
max_error=0;probes=0;worst=None
for case in cases:
 set_pose(p,case['matrices'])
 for axis in range(3):
  g.uniform1f(g.getUniform(p,b'u_axis'),axis);g.clearColor(0,0,0,0);g.clear(0x4000);g.drawArrays(0,0,V);g.finish()
  raw=(C.c_ubyte*(PW*PH*4))();g.readPixels(0,0,PW,PH,0x1908,0x1401,raw)
  for i in range(V):
   assert raw[4*i+3]==255,('vertex probe missing',i)
   actual=(raw[4*i]*65536+raw[4*i+1]*256+raw[4*i+2])/16777215*4096-2048
   error=abs(actual-case['positions'][i*3+axis]);probes+=1
   if error>max_error:max_error=error;worst={'input':case['input'],'vertex':i,'axis':axis}
   assert error<.003,('export/GLES skin mismatch',case['input'],i,axis,error)
 assert g.error()==0

# Lighting uses geometric normals recomputed on posed welded triangles. Rest normals
# transformed by LBS omit the spatial weight gradient at joints/support transitions.
def posed_normals(points):
 ns=[0.0]*(V*3)
 for i in range(0,len(indices),3):
  ids=indices[i:i+3];a,b,c=[points[k*3:k*3+3] for k in ids]
  u=[b[k]-a[k] for k in range(3)];v=[c[k]-a[k] for k in range(3)]
  n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
  for j in ids:
   for k in range(3):ns[j*3+k]+=n[k]
 for i in range(0,len(ns),3):
  length=math.hypot(*ns[i:i+3]);assert length>0
  for k in range(3):ns[i+k]/=length
 return struct.pack('<'+'f'*len(ns),*ns)
p=program(source,'precision highp float;varying vec3 v_color;void main(){gl_FragColor=vec4(v_color,1);}')
g.viewport(0,0,g.W,g.H);g.enable(0x0B71);g.enable(0x0B44);front(0x0900);g.depthFunc(0x0201)
ib=g.U();g.genBuffer(1,C.byref(ib));g.bindBuffer(0x8893,ib);data=(g.assets/'scene_indices.bin').read_bytes();g.bufferData(0x8893,len(data),data,0x88E4)
canvas=Image.new('RGB',(1080,1236),(18,24,32));d=ImageDraw.Draw(canvas);counts=[]
chosen=[cases[0],cases[13],cases[-1]]
for row,camera in enumerate([(-.6,.12),(.6,-.12)]):
 for col,case in enumerate(chosen):
  bind(p,posed_normals(case['positions']));set_pose(p,case['matrices'],camera,0)
  g.clearColor(.07,.09,.125,1);g.clear(0x4000|0x0100);draw(4,len(indices),0x1403,None);g.finish();assert g.error()==0
  raw=(C.c_ubyte*(g.W*g.H*4))();g.readPixels(0,0,g.W,g.H,0x1908,0x1401,raw)
  im=Image.frombytes('RGBA',(g.W,g.H),bytes(raw)).transpose(Image.Transpose.FLIP_TOP_BOTTOM).convert('RGB')
  occupied=sum(1 for r,green,b in im.get_flattened_data() if max(r,green,b)-min(r,green,b)>40);assert occupied>8000;counts.append(occupied)
  canvas.paste(im.resize((360,588)),(col*360,row*618+30));d.text((col*360+6,row*618+7),f'camera {camera} / pose {col-1:+}',fill='white')
canvas.save(root/'validation/s2-posed-gles.jpg',quality=91)
result={'renderer':g.getString(0x1F01).decode(),'exportVersion':3,'poseCases':len(cases),'vertexComponentProbes':probes,'maxWorldError':max_error,'worst':worst,'renderedViews':6,'colouredPixels':counts,'geometricPosedNormals':True,'texturedHiddenFaces':False,'debugOnly':True,'phoneTested':False}
(root/'validation/s2-posed-gles.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

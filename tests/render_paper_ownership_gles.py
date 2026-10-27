"""Reproducible paper occlusion views; zero body pose, no rear shell."""
import ctypes as C,json,struct,subprocess,math,os,tempfile,io,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
import render_gles as g
inputPaths=['character-prototype/preview/'+name for name in ['observed-scene.mjs','paper-source-partition.mjs','near-arm-surface.mjs','observed-background.mjs','forearm-surface.mjs','scene-model.mjs','structure.mjs','observed-surface.vert','observed-surface.frag']]+['android-app/app/src/main/assets/'+name for name in ['original.png','mask.png']]
def input_receipts():return [{'path':p,'sha256':hashlib.sha256((g.ROOT/p).read_bytes()).hexdigest(),'bytes':(g.ROOT/p).stat().st_size} for p in inputPaths]
inputFiles=input_receipts()
bodyPose=json.loads(os.environ.get('PAPER_BODY_POSE','{}'))
assert isinstance(bodyPose,dict) and set(bodyPose)<=set(['yaw','pitch','roll'])
assert all(isinstance(v,(int,float)) and math.isfinite(v) and abs(v)<=.08 for v in bodyPose.values())
module='./character-prototype/preview/observed-scene.mjs'
baseline=os.environ.get('PAPER_BASELINE_REF')
if baseline:
 import re
 assert re.fullmatch('[0-9a-f]{40}',baseline)
 old=subprocess.check_output(['git','show',baseline+':character-prototype/preview/observed-scene.mjs'],cwd=g.ROOT,text=True)
 tmp=tempfile.NamedTemporaryFile(mode='w',suffix='.mjs',prefix='.paper-baseline-',dir=g.ROOT/'character-prototype/preview',delete=False);tmp.write(old);tmp.close();module=Path(tmp.name).as_uri()
script="""import {buildObservedScene} from 'MODULE';import {poseUniforms} from './character-prototype/preview/structural-pose.mjs';console.log(JSON.stringify({scene:buildObservedScene({lapContactWidth:Number(process.env.PAPER_LAP_WIDTH||48),seatSupport:process.env.PAPER_SEAT_SUPPORT==='1',nearArmVolume:process.env.NEAR_ARM_VOLUME==='1',forearmJoinedDepth:process.env.FOREARM_JOINED_DEPTH==='1',forearmVolume:process.env.PAPER_FOREARM_VOLUME==='1',paperPartition:process.env.PAPER_PARTITION==='1',paperLapContact:process.env.PAPER_LAP_CONTACT==='1',paperRightClothContact:process.env.PAPER_RIGHT_CLOTH_CONTACT==='1',paperUnderHandBackgroundPlane:process.env.PAPER_UNDER_HAND_BACKGROUND_PLANE==='1',paperUnderHandBackgroundTrim:process.env.PAPER_UNDER_HAND_BACKGROUND_TRIM==='1',paperBackgroundTrim:process.env.PAPER_BACKGROUND_TRIM==='1',paperExteriorTrim:process.env.PAPER_EXTERIOR_TRIM==='1'}),bones:poseUniforms(JSON.parse(process.env.PAPER_BODY_POSE||'{}')).map(x=>Array.from(x))}));"""
script=script.replace('MODULE',module)
data=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=g.ROOT,text=True))
if baseline:Path(tmp.name).unlink()
p=g.createProgram()
for file,kind in [('observed-surface.vert',0x8B31),('observed-surface.frag',0x8B30)]:
 text=(g.ROOT/'character-prototype/preview'/file).read_bytes();s=g.createShader(kind);raw=C.c_char_p(text);g.shaderSource(s,1,C.byref(raw),None);g.compileShader(s);ok=g.I();g.getShader(s,0x8B81,C.byref(ok));assert ok.value;g.attach(p,s)
g.link(p);ok=g.I();g.getProgram(p,0x8B82,C.byref(ok));assert ok.value;g.use(p)
matrix=g.gl('glUniformMatrix4fv',None,g.I,g.I,C.c_ubyte,C.POINTER(g.F));matrix(g.getUniform(p,b'u_bones[0]'),6,0,(g.F*96)(*sum(data['bones'],[])))
g.uniform1f(g.getUniform(p,b'u_debug'),2 if os.environ.get('PAPER_DEBUG_OWNERSHIP')=='1' else 0);g.uniform1i(g.getUniform(p,b'u_source'),0);g.uniform1i(g.getUniform(p,b'u_mask'),1);g.activeTexture(0x84C0);g.bindTexture(0x0DE1,g.textures['original.png']);g.activeTexture(0x84C1);g.bindTexture(0x0DE1,g.textures['mask.png'])
g.enable(0x0BE2);g.blend(0x0302,0x0303);g.enable(0x0B71);g.depthFunc(0x0201);g.disable(0x0B44)
sceneSurfaces=([data['scene']['background']] if data['scene'].get('background') else [])+[data['scene']['body'],data['scene']['paper']]
materialKey=lambda s:'background' if s.get('background') else ('paper' if s['paper'] else 'body')
buffers={}
for flat in [False,True]:
 for s in sceneSurfaces:
  positions=s['positions']
  if flat:positions=[n for i in range(s['vertices']) for n in [(s['uv'][i*2]*1152-790),(s['uv'][i*2+1]*1536-1110),0]]
  attrs=[]
  for name,values,width,stride,offset in [('position',positions,3,0,0),('uv',s['uv'],2,0,0),('weights0',s['skinWeights'],4,24,0),('weights1',s['skinWeights'],2,24,16),('support',s['supportWeights'],1,0,0)]:
   b=g.buffer(struct.pack('<'+'f'*len(values),*values));attrs.append((g.getAttrib(p,('a_'+name).encode()),b,width,stride,offset))
  buffers[(flat,materialKey(s))]=(attrs,s['vertices'])
def render(flat=False,camera=(0,0)):
 g.use(p);g.uniform2f(g.getUniform(p,b'u_camera'),*camera);g.clearColor(.05,.075,.115,1);g.clear(0x4000|0x0100)
 for surface in sceneSurfaces:
  paper=surface['paper'];background=surface.get('background',False)
  for i in range(8):g.disableAttr(i)
  attrs,V=buffers[(flat,materialKey(surface))]
  for loc,b,width,stride,offset in attrs:g.bindBuffer(0x8892,b);g.enableAttr(loc);g.attrPointer(loc,width,0x1406,0,stride,C.c_void_p(offset))
  g.uniform1f(g.getUniform(p,b'u_masked'),0 if paper or background else 1);g.uniform1f(g.getUniform(p,b'u_background'),int(background));g.drawArrays(4,0,V)
 g.finish();assert g.error()==0;raw=(C.c_ubyte*(g.W*g.H*4))();g.readPixels(0,0,g.W,g.H,0x1908,0x1401,raw)
 return Image.frombytes('RGBA',(g.W,g.H),bytes(raw)).transpose(Image.Transpose.FLIP_TOP_BOTTOM).convert('RGB')
def save_checked(im,path,format,**options):
 blob=io.BytesIO();im.save(blob,format=format,**options);raw=blob.getvalue();Image.open(io.BytesIO(raw)).verify()
 temp=path.with_suffix(path.suffix+'.tmp');temp.write_bytes(raw);temp.replace(path);Image.open(path).verify()
 return {'path':str(path.relative_to(g.ROOT)),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
frames=[];rawFrames=[]
for angle in [-20,-2.2918,0,2.2918,20]:
 im=render(camera=(math.radians(angle),0));frames.append(im)
 if os.environ.get('PAPER_RAW_PREFIX'):rawFrames.append(save_checked(im,g.ROOT/'validation'/f'{os.environ["PAPER_RAW_PREFIX"]}-{angle}.png','PNG'))
canvas=Image.new('RGB',(540*5,1206),(18,24,32));d=ImageDraw.Draw(canvas)
for i,(angle,im) in enumerate(zip([-20,-2.2918,0,2.2918,20],frames)):
 canvas.paste(im,(i*540,30));d.text((i*540+8,8),f'yaw {angle} / body {bodyPose} / no rear',fill='white')
name=os.environ.get('PAPER_REPORT','paper-ownership-before')
imageReceipt=save_checked(canvas,g.ROOT/'validation'/f'{name}.jpg','JPEG',quality=90)
assert input_receipts()==inputFiles,'Source changed during raster capture; repeat from a stable checkpoint'
result={'forearmJoinedDepth':os.environ.get('FOREARM_JOINED_DEPTH')=='1','inputFiles':inputFiles,'nearArmVolume':os.environ.get('NEAR_ARM_VOLUME')=='1','debugOwnership':os.environ.get('PAPER_DEBUG_OWNERSHIP')=='1','paperUnderHandBackgroundPlane':bool(data['scene'].get('background')),'rawFrames':rawFrames,'imageReceipt':imageReceipt,'paperUnderHandBackgroundTrim':os.environ.get('PAPER_UNDER_HAND_BACKGROUND_TRIM')=='1','paperBackgroundTrim':os.environ.get('PAPER_BACKGROUND_TRIM')=='1','paperRightClothContact':os.environ.get('PAPER_RIGHT_CLOTH_CONTACT')=='1','lapContactWidth':float(os.environ.get('PAPER_LAP_WIDTH','48')),'seatSupport':os.environ.get('PAPER_SEAT_SUPPORT')=='1','forearmVolume':os.environ.get('PAPER_FOREARM_VOLUME')=='1','renderer':g.getString(0x1F01).decode(),'angles':[-20,-2.2918,0,2.2918,20],'rear':False,'bodyPose':bodyPose,'paperPartition':os.environ.get('PAPER_PARTITION')=='1','baselineRef':baseline,'paperLapContact':os.environ.get('PAPER_LAP_CONTACT')=='1','paperExteriorTrim':os.environ.get('PAPER_EXTERIOR_TRIM')=='1','image':f'validation/{name}.jpg','phoneTested':False}
(g.ROOT/'validation'/f'{name}.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

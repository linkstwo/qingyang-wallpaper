"""Before/after production GLES hair rendering with explicit CPU mesh-fold diagnostics."""
import ctypes as C
import json, subprocess
from PIL import Image, ImageDraw, ImageChops
import render_gles as g
BASE='ab69656ada60996787f89df31818d48051a207d9'
def select_vertex(source):
 program=g.createProgram()
 for raw,kind in [(source,0x8B31),((g.assets/'scene.frag').read_bytes(),0x8B30)]:
  shader=g.createShader(kind);text=C.c_char_p(raw);g.shaderSource(shader,1,C.byref(text),None);g.compileShader(shader)
  ok=g.I();g.getShader(shader,0x8B81,C.byref(ok));assert ok.value,'hair scan shader compilation';g.attach(program,shader)
 g.link(program);ok=g.I();g.getProgram(program,0x8B82,C.byref(ok));assert ok.value
 g.use(program);g.locations={name:g.getUniform(program,('u_'+name).encode()) for name in g.locations}
 g.a=g.getAttrib(program,b'a_source');g.pin=g.getAttrib(program,b'a_pin');g.depth_attr=g.getAttrib(program,b'a_depth');g.enableAttr(g.a)
 g.u('size',1086,1448);g.uniform1i(g.locations['texture'],0);g.uniform1i(g.locations['mask'],1)
cases=[{'name':'neutral','view':[0,0],'body':[0,0],'chest':[0,0,0],'hair':[0,0]},
 {'name':'hard +X +Y','view':[1,-1],'body':[6,6],'chest':[11.9,11.9,10.2],'hair':[21,10.5]},
 {'name':'hard +X -Y','view':[-1,1],'body':[6,-6],'chest':[11.9,-11.9,10.2],'hair':[21,-10.5]}]
script="""import fs from 'node:fs';import {execFileSync} from 'node:child_process';
import {makeMesh} from './character-prototype/preview/rig.mjs';
import {contactWeights} from './character-prototype/preview/contact-rig.mjs';
import * as current from './character-prototype/preview/structure.mjs';
const old=await import('data:text/javascript;base64,'+Buffer.from(execFileSync('git',['show','BASE:character-prototype/preview/structure.mjs'])).toString('base64'));
const config=JSON.parse(fs.readFileSync('character-prototype/preview/mesh.json'));
const v=makeMesh([[0,0],[1086,0],[1086,1448],[0,1448]],[],config.limits.triangleEdgePixels),z=current.depthWeights(v),pins=contactWeights(v),out=[];
for(const model of [old,current]){const records=[];
 for(const item of JSON.parse(process.argv[1])){const triangles=[];
  for(let i=0;i<z.length;i+=3){const source=[0,1,2].map(n=>[v[2*(i+n)],v[2*(i+n)+1]]);
   if(!source.some(([x,y])=>x>90&&x<430&&y>230&&y<710))continue;
   const q=[0,1,2].map(n=>model.deformPoint(...source[n],z[i+n],item.view,item.body,item.chest,item.hair,1.45,pins[i+n]));
   const area=p=>(p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0]);
   triangles.push({q,ratio:area(q)/area(source)});
  }records.push(triangles);
 }out.push(records);
}console.log(JSON.stringify(out));""".replace('BASE:',BASE+':')
meshes=json.loads(subprocess.check_output(['node','--input-type=module','-e',script,json.dumps(cases)],cwd=g.ROOT,text=True))
w,h=220,316;row_height=h+40
board=Image.new('RGB',(w*4,row_height*len(cases)+32),'#101820');d=ImageDraw.Draw(board)
d.text((8,6),'Synthetic simultaneous hard limits / GLES crops + CPU mesh / red triangles = fold / not a phone',fill='white')
k,x,y,_=g.frame(True);box=tuple(map(int,(x+100*k,y+240*k,x+420*k,y+700*k)))
neutral=legacy=None;folds=[]
for model,source in enumerate([subprocess.check_output(['git','show',BASE+':character-prototype/preview/scene.vert'],cwd=g.ROOT),(g.assets/'scene.vert').read_bytes()]):
 select_vertex(source)
 label='before' if model==0 else 'repaired'
 for row,item in enumerate(cases):
  frame=g.render(**{key:value for key,value in item.items() if key!='name'})
  if row==0:
   if model==0:neutral=frame
   else:assert ImageChops.difference(neutral.convert('RGB'),frame.convert('RGB')).getbbox() is None,'neutral rendering changed'
  panel=frame.crop(box).convert('RGB').resize((w,h),Image.Resampling.LANCZOS)
  py=32+row*row_height;px=model*w
  board.paste(panel,(px,py+32));d.text((px+6,py+6),label+' GLES: '+item['name'],fill='white')
  wire=Image.new('RGB',(w,h),'#17222c');draw=ImageDraw.Draw(wire);negative=0
  for triangle in meshes[model][row]:
   q=[((a-100)/320*w,(b-240)/460*h) for a,b in triangle['q']]
   bad=triangle['ratio']<0
   if bad:draw.polygon(q,fill='#d44246');negative+=1
   draw.line(q+[q[0]],fill='#ff7478' if bad else '#648c92',width=1)
  board.paste(wire,((model+2)*w,py+32));d.text(((model+2)*w+6,py+6),label+f' CPU mesh: {negative} folds',fill='white')
  folds.append({'model':label,'case':item['name'],'negativeHairTriangles':negative})
 legacy_frame=g.render(view=(1,-1),body=(2,-1),chest=(4,-3,2),hair=(5,2),enhanced=False)
 if model==0:legacy=legacy_frame
 else:assert ImageChops.difference(legacy.convert('RGB'),legacy_frame.convert('RGB')).getbbox() is None,'legacy response rendering changed'
output=g.ROOT/'validation';board.save(output/'hair-safety-scan.jpg',quality=88)
assert any(r['negativeHairTriangles']>0 for r in folds if r['model']=='before'),'baseline visual must contain the known fold'
assert all(r['negativeHairTriangles']==0 for r in folds if r['model']=='repaired'),'repaired visual cases must not fold'
result={'baseline':BASE,'productionGlesCrops':6,'cpuMeshDiagnostics':6,'neutralPixelIdentical':True,'legacyPixelIdentical':True,'folds':folds,'phoneTested':False}
(output/'hair-scan.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

"""Same production rendering/input for baseline and current structure; no phone claims."""
import ctypes as C
import json, subprocess
from PIL import Image, ImageDraw, ImageChops
import render_gles as g
BASELINE='101814578b9fa09be50f2d642f1cc79dea83e222'
def select_vertex(source):
 program=g.createProgram()
 for raw,kind in [(source,0x8B31),((g.assets/'scene.frag').read_bytes(),0x8B30)]:
  shader=g.createShader(kind);text=C.c_char_p(raw);g.shaderSource(shader,1,C.byref(text),None);g.compileShader(shader)
  ok=g.I();g.getShader(shader,0x8B81,C.byref(ok));assert ok.value,'scan shader compilation';g.attach(program,shader)
 g.link(program);ok=g.I();g.getProgram(program,0x8B82,C.byref(ok));assert ok.value
 g.use(program)
 g.locations={name:g.getUniform(program,('u_'+name).encode()) for name in g.locations}
 g.a=g.getAttrib(program,b'a_source');g.pin=g.getAttrib(program,b'a_pin');g.depth_attr=g.getAttrib(program,b'a_depth');g.enableAttr(g.a)
 g.u('size',1086,1448);g.uniform1i(g.locations['texture'],0);g.uniform1i(g.locations['mask'],1)
views=[(-1,-1),(0,-1),(1,-1),(-1,0),(0,0),(1,0),(-1,1),(0,1),(1,1)]
out=g.ROOT/'validation';out.mkdir(exist_ok=True)
# Crop source-space head/neck region identically; full frames remain available via renderer.
k,x,y,_=g.frame(True);box=tuple(map(int,(x+280*k,y+140*k,x+900*k,y+650*k)))
canvas=Image.new('RGB',(6*248,3*230),'#151d26');draw=ImageDraw.Draw(canvas)
neutral=None
for col,(label,source) in enumerate([
 ('baseline',subprocess.check_output(['git','show',f'{BASELINE}:character-prototype/preview/scene.vert'],cwd=g.ROOT)),
 ('head plate',(g.assets/'scene.vert').read_bytes())]):
 select_vertex(source)
 for i,view in enumerate(views):
  full=g.render(view=view)
  if view==(0,0):
   if col==0:neutral=full
   else:assert ImageChops.difference(neutral.convert('RGB'),full.convert('RGB')).getbbox() is None,'neutral image changed'
  im=full.crop(box).convert('RGB');im.thumbnail((248,204))
  px=(i%3+col*3)*248;py=(i//3)*230
  canvas.paste(im,(px,py+24));draw.text((px+5,py+5),f'{label}: yaw {view[0]:+} pitch {view[1]:+}',fill='white')
canvas.resize((992,460)).save(out/'head-structure-scan.jpg',quality=80)
(out/'head-scan.json').write_text(json.dumps({'baseline':BASELINE,'viewPairs':9,'neutralPixelIdentical':True,'productionShaders':True,'phoneTested':False},indent=2)+'\n')
print('PASS: 18 production-GLES baseline/current scan frames')

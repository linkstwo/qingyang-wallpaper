"""Actual production shaders + exported buffers; candidate visual evidence, no phone."""
import ctypes as C,json,math,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
import render_gles as g
A=g.assets
mesh=g.buffer((A/'round_character_mesh.bin').read_bytes());pins=g.buffer((A/'round_character_pins.bin').read_bytes());depth=g.buffer((A/'round_character_depth.bin').read_bytes());paper=g.buffer((A/'round_foreground_mesh.bin').read_bytes());side=g.buffer((A/'side_back_mesh.bin').read_bytes());sz=g.buffer((A/'side_back_depth.bin').read_bytes());uv=g.buffer((A/'side_back_uv.bin').read_bytes())
tex=g.U();g.genTexture(1,C.byref(tex));g.bindTexture(0x0DE1,tex)
for p in [0x2801,0x2800]:g.texParam(0x0DE1,p,0x2601)
for p in [0x2802,0x2803]:g.texParam(0x0DE1,p,0x812F)
im=Image.open(A/'side-back.png').convert('RGBA');g.texImage(0x0DE1,0,0x1908,*im.size,0,0x1908,0x1401,im.tobytes())
aUv=g.getAttrib(g.program,b'a_uv');roundLoc=g.getUniform(g.program,b'u_roundMode')
# Match Android's chest-centred default source window. Keep the side in view.
scale=540/1152*1.28;mapping=(scale,270-725*scale,588-755*scale,1.4)
def render(v,enabled=True,motion=False,values=None):
 g.use(g.program);g.uniform1f(roundLoc,1);g.u('structureMode',1);g.u('view',v,0);g.u('body',*( (1.2,-.8) if motion else (0,0)));g.u('chest',*((5,2,1) if motion else (0,0,0)));g.u('hair',0,0);g.u('motionGain',1.4);g.u('softFrame',1);g.u('cover',1)
 if values is not None:
  g.u('body',*values[:2]);g.u('chest',values[2],values[3],values[6]);g.u('hair',*values[4:6])
 g.disable(0x0B71);g.depthMask(1);g.clearColor(.06,.09,.12,1);g.clear(0x4000|0x0100)
 g.transform(g.frame(False));g.layer(g.quad,6,'background.png',-1,0)
 g.transform(mapping);g.layer(g.quad,6,'original.png',0,0);g.layer(g.quad,6,'background.png',0,2)
 g.enable(0x0B71);g.depthFunc(0x0203)
 oldp,oldd=g.pins,g.depths;g.pins,g.depths=pins,depth;g.layer(mesh,(A/'round_character_mesh.bin').stat().st_size//8,'original.png',1,1,True);g.pins,g.depths=oldp,oldd
 if enabled:
  g.u('layer',2);g.u('maskMode',0);g.activeTexture(0x84C0);g.bindTexture(0x0DE1,tex)
  g.disableAttr(g.pin);g.constantAttr(g.pin,0);g.enableAttr(g.depth_attr);g.bindBuffer(0x8892,sz);g.attrPointer(g.depth_attr,1,0x1406,0,0,None)
  g.enableAttr(aUv);g.bindBuffer(0x8892,uv);g.attrPointer(aUv,2,0x1406,0,0,None)
  g.bindBuffer(0x8892,side);g.attrPointer(g.a,2,0x1406,0,0,None);g.drawArrays(4,0,(A/'side_back_mesh.bin').stat().st_size//8);g.disableAttr(aUv)
 g.layer(paper,(A/'round_foreground_mesh.bin').stat().st_size//8,'original.png',3,0)
 g.finish();assert g.error()==0;raw=(C.c_ubyte*(g.W*g.H*4))();g.readPixels(0,0,g.W,g.H,0x1908,0x1401,raw);return Image.frombytes('RGBA',(g.W,g.H),bytes(raw)).transpose(Image.Transpose.FLIP_TOP_BOTTOM).convert('RGB')
frames=[];rows=[]
for v in [-1,-.5,0,.5,1]:
 im=render(v);base=render(v,False);diff=np.abs(np.asarray(im).astype(int)-np.asarray(base).astype(int));rows.append({'view':v,'yawDegrees':v*.30*180/math.pi,'donorChangedPixels':int((diff.max(axis=2)>3).sum())});frames.append(im)
assert rows[0]['donorChangedPixels']>40,'No visible donor side at revealing angle'
canvas=Image.new('RGB',(g.W*5,g.H+28));d=ImageDraw.Draw(canvas)
for i,im in enumerate(frames):canvas.paste(im,(i*g.W,28));d.text((i*g.W+8,7),f"first-pass yaw {rows[i]['yawDegrees']:.1f} / donor {rows[i]['donorChangedPixels']}px",fill='white')
canvas.save(g.ROOT/'validation/first-pass-gles.jpg',quality=90)
frames[0].save('/tmp/qy-first-side.png');frames[2].save('/tmp/qy-first-neutral.png');render(-1,motion=True).save('/tmp/qy-first-motion.png')
r={'actualProductionGles':True,'renderer':g.getString(0x1F01).decode(),'approximateRegistration':True,'rows':rows,'phoneTested':False,'wholeTasksAccepted':[],'sourceShaders':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [A/'scene.vert',A/'scene.frag']}}
(g.ROOT/'validation/first-pass-gles.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))

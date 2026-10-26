"""Production GLES vertex depth + fragment matte occlusion regressions, no phone claim."""
import ctypes as C,json
import render_gles as g
# Use the production program and textures. Draw an overlapping source triangle on
# the body and independent support plane; near geometry must win in either order.
g.disable(0x0BE2);g.enable(0x0B71);g.depthFunc(0x0203);g.depthMask(1)
g.u('ndcScale',2/1152,-2/1536);g.u('ndcOffset',-1,1);g.u('motionGain',1);g.u('structureMode',1);g.u('softFrame',0);g.u('cover',1)
g.u('view',0,0);g.u('body',0,0);g.u('chest',0,0,0);g.u('hair',0,0)
getint=g.gl('glGetIntegerv',None,g.U,C.POINTER(g.I));bits=g.I();getint(0x0D56,C.byref(bits));assert bits.value>=16
for attr in [g.pin,g.depth_attr]:g.disableAttr(attr)
g.enableAttr(g.a);g.constantAttr(g.pin,1)
# Different textures identify the winning surface without replacing production fragment logic.
def triangle(points):
 b=g.buffer(bytes((g.F*6)(*sum(points,[]))));g.bindBuffer(0x8892,b);g.attrPointer(g.a,2,0x1406,0,0,None);return b
def pixel(p):
 x=int(p[0]*g.W/1152);y=int(g.H-p[1]*g.H/1536);raw=(C.c_ubyte*4)();g.readPixels(x,y,1,1,0x1908,0x1401,raw);return tuple(raw[:3])
def draw(layer,depth,mask,texture):
 g.u('layer',layer);g.u('maskMode',mask);g.constantAttr(g.depth_attr,depth);g.bindTexture(0x0DE1,g.textures[texture]);g.drawArrays(4,0,3)
def clear():g.clearColor(0,0,0,1);g.clear(0x4000|0x0100)
triangle([[650,720],[800,720],[725,880]]);center=[725,775]
clear();draw(3,0,0,'original.png');paper=pixel(center)
clear();draw(1,300,0,'background.png');body=pixel(center)
assert sum(abs(a-b) for a,b in zip(body,paper))>30,'fixture surfaces must be visibly different'
checks=0
for near in [False,True]:
 for reverse in [False,True]:
  clear();items=[(1,300 if near else 0,0,'background.png'),(3,0,0,'original.png')]
  for item in items[::(-1 if reverse else 1)]:draw(*item)
  got=pixel(center);assert got==(body if near else paper),('wrong surface won',near,reverse,got,paper,body);checks+=1
# An empty piece of the character matte at a nearer depth must not write depth.
triangle([[60,140],[160,140],[100,260]]);center=[100,190]
clear();draw(3,0,0,'original.png');expected=pixel(center);assert sum(expected)>30
clear();draw(1,400,1,'original.png');draw(3,0,0,'original.png');assert pixel(center)==expected,'transparent matte blocked support';checks+=1
assert g.error()==0
result={'checks':checks,'depthBits':bits.value,'bothDrawOrders':True,'transparentMatteDoesNotOcclude':True,'productionShader':True,'phoneTested':False}
(g.ROOT/'validation/s2-depth-order-gles.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

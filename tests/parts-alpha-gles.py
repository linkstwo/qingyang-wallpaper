"""Actual GLES filtering of the parts raster shader; DOM upload remains browser pending."""
import ctypes as C,re,json
import render_gles as g
text=(g.ROOT/'character-prototype/preview/parts-raster.mjs').read_text()
assert 'gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true)' in text
fragment=re.search("shader\\(gl.FRAGMENT_SHADER,'([^']+)'",text).group(1)
p=g.createProgram()
for source,kind in [('attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=vec2(.5);gl_Position=vec4(a_position,0.,1.);}',0x8B31),(fragment,0x8B30)]:
 s=g.createShader(kind);raw=C.c_char_p(source.encode());g.shaderSource(s,1,C.byref(raw),None);g.compileShader(s);ok=g.I();g.getShader(s,0x8B81,C.byref(ok));assert ok.value;g.attach(p,s)
g.link(p);ok=g.I();g.getProgram(p,0x8B82,C.byref(ok));assert ok.value;g.use(p)
# An RGBA texture target is required: the shared EGL pbuffer has no alpha channel.
genF=g.gl('glGenFramebuffers',None,g.I,C.POINTER(g.U));bindF=g.gl('glBindFramebuffer',None,g.U,g.U);attachF=g.gl('glFramebufferTexture2D',None,g.U,g.U,g.U,g.U,g.I);checkF=g.gl('glCheckFramebufferStatus',g.U,g.U)
target=g.U();g.genTexture(1,C.byref(target));g.bindTexture(0x0DE1,target);g.texImage(0x0DE1,0,0x1908,8,8,0,0x1908,0x1401,None);g.texParam(0x0DE1,0x2801,0x2600);g.texParam(0x0DE1,0x2800,0x2600)
fbo=g.U();genF(1,C.byref(fbo));bindF(0x8D40,fbo);attachF(0x8D40,0x8CE0,0x0DE1,target,0);assert checkF(0x8D40)==0x8CD5;g.viewport(0,0,8,8)
g.disable(0x0BE2);g.disable(0x0B71);g.activeTexture(0x84C0);texture=g.U();g.genTexture(1,C.byref(texture));g.bindTexture(0x0DE1,texture)
for param in [0x2801,0x2800]:g.texParam(0x0DE1,param,0x2601)
for param in [0x2802,0x2803]:g.texParam(0x0DE1,param,0x812F)
g.uniform1i(g.getUniform(p,b'u_image'),0)
loc=g.getAttrib(p,b'a_position');g.buffer(bytes((g.F*6)(-1,-1,3,-1,-1,3)));g.enableAttr(loc);g.attrPointer(loc,2,0x1406,0,0,None)
def sample(data):
 g.texImage(0x0DE1,0,0x1908,2,1,0,0x1908,0x1401,bytes(data));g.drawArrays(4,0,3);g.finish();pixel=(C.c_ubyte*4)();g.readPixels(4,4,1,1,0x1908,0x1401,pixel);assert g.error()==0;return list(pixel)
negative=sample([200,100,50,255,0,200,255,0])
correct=sample([200,100,50,255,0,0,0,0])
assert max(abs(a-b) for a,b in zip(correct,[100,50,25,128]))<=1
assert abs(negative[1]-50)>80 and abs(negative[2]-25)>100
result={'renderer':g.getString(0x1F01).decode(),'premultiplied':correct,'straightUploadNegative':negative,'transparentRgbFringeRejected':True,'actualPartsFragmentShader':True,'browserDomUploadTested':False,'phoneTested':False}
(g.ROOT/'validation/f13-parts-alpha-gles.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

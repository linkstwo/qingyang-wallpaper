"""Actual depth-tested S2 part/normal/depth views; inferred, untextured geometry only."""
import ctypes as C,json
from PIL import Image,ImageDraw
import render_gles as g
vertex='''precision highp float;
attribute vec3 a_position,a_normal;attribute float a_region,a_confidence;
uniform float u_yaw,u_mode;varying vec3 v_color;
void main(){float c=cos(u_yaw),s=sin(u_yaw);vec3 p=vec3(c*a_position.x+s*a_position.z,a_position.y,-s*a_position.x+c*a_position.z),n=normalize(vec3(c*a_normal.x+s*a_normal.z,a_normal.y,-s*a_normal.x+c*a_normal.z));
float w=(2300.0-p.z)/2300.0;vec2 q=p.xy/w+vec2(790.0,1110.0);
vec3 color=a_region<1.5?vec3(.24,.68,.9):(a_region<2.5?vec3(.95,.65,.2):vec3(.4,.85,.4));if(a_confidence<.01)color=mix(color,vec3(.9,.16,.65),.7);
v_color=color*(.4+.6*max(0.0,dot(n,normalize(vec3(-.4,-.6,1.0)))));if(u_mode>.5)v_color=n*.5+.5;if(u_mode>1.5)v_color=mix(vec3(.15,.3,.7),vec3(1.0,.85,.2),clamp((p.z+500.0)/1000.0,0.0,1.0));
gl_Position=vec4((q*vec2(2.0/1600.0,-2.0/1740.0)+vec2(-.72,.92))*w,(4250.0-14.0*p.z)/17250.0,w);}'''
fragment='precision highp float;varying vec3 v_color;void main(){gl_FragColor=vec4(v_color,1.0);}'
program=g.createProgram()
for source,kind in [(vertex,0x8B31),(fragment,0x8B30)]:
 shader=g.createShader(kind);raw=C.c_char_p(source.encode());g.shaderSource(shader,1,C.byref(raw),None);g.compileShader(shader);ok=g.I();g.getShader(shader,0x8B81,C.byref(ok));assert ok.value;g.attach(program,shader)
g.link(program);ok=g.I();g.getProgram(program,0x8B82,C.byref(ok));assert ok.value;g.use(program)
for i in range(8):g.disableAttr(i)
for name,file,width in [('position','scene_positions.bin',3),('normal','scene_normals.bin',3),('region','scene_regions.bin',1),('confidence','scene_confidence.bin',1)]:
 loc=g.getAttrib(program,('a_'+name).encode());g.buffer((g.assets/file).read_bytes());g.enableAttr(loc);g.attrPointer(loc,width,0x1406,0,0,None)
indices=(g.assets/'scene_indices.bin').read_bytes();ident=g.U();g.genBuffer(1,C.byref(ident));g.bindBuffer(0x8893,ident);g.bufferData(0x8893,len(indices),indices,0x88E4)
draw=g.gl('glDrawElements',None,g.U,g.I,g.U,g.P);front=g.gl('glFrontFace',None,g.U);g.enable(0x0B71);g.enable(0x0B44);front(0x0900);g.depthFunc(0x0201);g.disable(0x0BE2)
getint=g.gl('glGetIntegerv',None,g.U,C.POINTER(g.I));bits=g.I();getint(0x0D56,C.byref(bits));assert bits.value>=16
yaw=g.getUniform(program,b'u_yaw');mode=g.getUniform(program,b'u_mode');canvas=Image.new('RGB',(810,1854),(18,24,32));d=ImageDraw.Draw(canvas);counts=[]
for row,label in enumerate(['parts / magenta = untextured','geometric normals','camera depth']):
 for col,angle in enumerate([-.7,0,.7]):
  g.uniform1f(yaw,angle);g.uniform1f(mode,row);g.clearColor(.07,.09,.125,1);g.clear(0x4000|0x0100);draw(4,len(indices)//2,0x1403,None);g.finish();assert g.error()==0
  raw=(C.c_ubyte*(g.W*g.H*4))();g.readPixels(0,0,g.W,g.H,0x1908,0x1401,raw);im=Image.frombytes('RGBA',(g.W,g.H),bytes(raw)).transpose(Image.Transpose.FLIP_TOP_BOTTOM).convert('RGB')
  occupied=sum(1 for r,green,b in im.get_flattened_data() if max(r,green,b)-min(r,green,b)>40);assert occupied>8000;counts.append(occupied)
  canvas.paste(im.resize((270,588)),(col*270,row*618+30));d.text((col*270+8,row*618+8),f'{label}: {angle:+.2f}rad',fill='white')
canvas.save(g.ROOT/'validation/s2-structure-gles.jpg',quality=91)
result={'renderer':g.getString(0x1F01).decode(),'depthBits':bits.value,'views':9,'colouredPixels':counts,'debugYawRadians':[-.7,0,.7],'debugOnly':True,'texturedHiddenFaces':False,'phoneTested':False}
(g.ROOT/'validation/s2-structure-gles.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

"""Compare production vertex projection to CPU landmarks through actual GPU rasterization.
Only gl_PointSize is added to the production vertex source; the projection stays unchanged.
"""
import ctypes as C
import json, math, subprocess
import render_gles as g

vertex=(g.assets/'scene.vert').read_text().replace('gl_Position=vec4(', 'gl_PointSize=3.0;\n    gl_Position=vec4(')
fragment='precision highp float;void main(){gl_FragColor=vec4(1.0);}'
program=g.createProgram()
for source,kind in [(vertex,0x8B31),(fragment,0x8B30)]:
 shader=g.createShader(kind);raw=C.c_char_p(source.encode());g.shaderSource(shader,1,C.byref(raw),None);g.compileShader(shader)
 ok=g.I();g.getShader(shader,0x8B81,C.byref(ok));assert ok.value,'point fixture shader compilation'
 g.attach(program,shader)
g.link(program);ok=g.I();g.getProgram(program,0x8B82,C.byref(ok));assert ok.value,'point fixture link';g.use(program)
loc=lambda n:g.getUniform(program,('u_'+n).encode())
for name,value in [('layer',1),('motionGain',1.45),('tipMode',1),('structureMode',1)]:g.uniform1f(loc(name),value)
for name in ['body','hair']:g.uniform2f(loc(name),0,0)
g.uniform3f(loc('chest'),0,0,0)
k,x,y,_=g.frame(True);g.uniform2f(loc('ndcScale'),2*k/g.W,-2*k/g.H);g.uniform2f(loc('ndcOffset'),2*x/g.W-1,1-2*y/g.H)
attrs={name:g.getAttrib(program,('a_'+name).encode()) for name in ['source','pin','depth']}
for index in attrs.values():g.disableAttr(index)
attr2=g.gl('glVertexAttrib2f',None,g.U,g.F,g.F)
script="""import {depthAt,deformPoint} from './character-prototype/preview/structure.mjs';
import {contactPin} from './character-prototype/preview/contact-rig.mjs';
const out=[];for(const vx of [-1,-.5,0,.5,1])for(const vy of [-1,0,1])
for(const moving of [0,1,2,3])for(const spatial of [false,true])for(const [x,y] of [[550,305],[940,490],[725,755],[985,1090],[330,990],[350,1005],[397,550],[590,535],[635,920],[1060,950],[370,500],[410,600]]){
 const depth=Math.fround(depthAt(x,y)),pin=Math.fround(contactPin(x,y));const body=moving>1?[6,6]:(moving?[2,-1]:[0,0]),chest=moving>1?[11.9,11.9,10.2]:(moving?[4,-3,2]:[0,0,0]),hair=moving>1?[21,moving===2?10.5:-10.5]:(moving?[5,2]:[0,0]);
 out.push({x,y,depth,pin,vx,vy,body,chest,hair,spatial,q:deformPoint(x,y,depth,[vx,vy],body,chest,hair,1.45,pin,spatial)});
}console.log(JSON.stringify(out));"""
fixtures=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=g.ROOT,text=True))
max_error=0
for item in fixtures:
 g.uniform1f(loc('structureMode'),int(item['spatial']))
 attr2(attrs['source'],item['x'],item['y']);g.constantAttr(attrs['depth'],item['depth']);g.constantAttr(attrs['pin'],item['pin'])
 g.uniform2f(loc('body'),*item['body']);g.uniform3f(loc('chest'),*item['chest']);g.uniform2f(loc('hair'),*item['hair'])
 g.uniform2f(loc('view'),item['vx'],item['vy']);g.clearColor(0,0,0,1);g.clear(0x4000);g.drawArrays(0,0,1);g.finish()
 expected_x=x+item['q'][0]*k;expected_y=g.H-(y+item['q'][1]*k)
 left=max(0,int(expected_x)-3);bottom=max(0,int(expected_y)-3)
 raw=(C.c_ubyte*(7*7*4))();g.readPixels(left,bottom,7,7,0x1908,0x1401,raw)
 lit=[(left+i%7+.5,bottom+i//7+.5) for i in range(49) if raw[i*4]>200]
 assert lit,('landmark missing near CPU projection',item)
 actual_x=sum(p[0] for p in lit)/len(lit);actual_y=sum(p[1] for p in lit)/len(lit)
 error=math.hypot(expected_x-actual_x,expected_y-actual_y);max_error=max(max_error,error)
 assert error<1.01,(error,item)
assert g.error()==0
result={'landmarks':len(fixtures),'maxRasterErrorPixels':max_error,'renderer':g.getString(0x1F01).decode(),'phoneTested':False}
(g.ROOT/'validation/projection-gles.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

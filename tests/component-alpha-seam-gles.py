"""Real raster negative control: shared geometry must not apply cutout alpha twice."""
from pathlib import Path
import os,subprocess,json,math
import numpy as np
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1]
for tag,legacy in [('legacy','1'),('fixed','0')]:
 subprocess.run(['python','tests/render_component_junction_gles.py'],cwd=root,env={**os.environ,'COMPONENT_DONOR':'nearDown','COMPONENT_LEGACY_ALPHA':legacy,'COMPONENT_RAW_TAG':tag},check=True)
mesh=json.loads(Path('/tmp/f14-component-warp-near-down.json').read_text());edges={}
for i in range(0,len(mesh['indices']),3):
 for k in range(3):
  a,b=sorted([mesh['indices'][i+k],mesh['indices'][i+(k+1)%3]]);edges.setdefault((a,b),[]).append(mesh['triangleGroups'][i//3])
seams=[edge for edge,g in edges.items() if len(g)==2 and g[0]!=g[1]]
source=Image.open(root/'../materials/archive/汗湿图纸与工业车间的专注时刻.png').convert('RGB');rgb=np.array(source,dtype=float)
def sample(x,y):
 x-=.5;y-=.5;a,b=math.floor(x),math.floor(y);tx,ty=x-a,y-b
 return rgb[b,a]*(1-tx)*(1-ty)+rgb[b,a+1]*tx*(1-ty)+rgb[b+1,a]*(1-tx)*ty+rgb[b+1,a+1]*tx*ty
old=np.array(Image.open('/tmp/f14-components-legacy-0.png'));fixed=np.array(Image.open('/tmp/f14-components-fixed-0.png'));pixels=set()
for a,b in seams:
 p,q=[mesh['sourcePositions'][i*2:i*2+2] for i in [a,b]]
 for t in [.2,.5,.8]:
  x,y=[p[k]+t*(q[k]-p[k]) for k in [0,1]];ix,iy=math.floor((x-790)/240*540),math.floor((y-380)/660*588)
  if ix>1 and iy>1 and ix<538 and iy<586 and fixed[iy-1:iy+2,ix-1:ix+2,0].min()>50:pixels.add((ix,iy))
assert len(pixels)>20
errors=[];darkened=0
for x,y in pixels:
 expected=sample(790+(x+.5)/540*240,380+(y+.5)/588*660);errors.append(float(np.max(np.abs(fixed[y,x].astype(float)-expected))))
 if int(fixed[y,x,0])-int(old[y,x,0])>=15:darkened+=1
assert max(errors)<=4,(max(errors),'fixed shared pixels must match original RGB sampling')
assert darkened>5,'old alpha path must expose actual raster seam, not a synthetic count'
out=Image.new('RGB',(720,500),(18,24,32));d=ImageDraw.Draw(out)
for i,tag in enumerate(['legacy','fixed']):
 im=Image.open('/tmp/f14-components-'+tag+'-0.png').crop((190,130,450,310)).resize((360,450));out.paste(im,(i*360,35));d.text((i*360+8,10),tag+' shared seam',fill='white')
out.save(root/'validation/f14-component-alpha-seam.jpg',quality=94)
report={'sharedEdges':len(seams),'interiorSeamPixelProbes':len(pixels),'legacyDarkenedPixels':darkened,'maxOriginalRgbSampleError':max(errors),'geometryOwnsCoverage':True,'rgbaSourceRgbPreserved':True,'actualGles':True,'mainRegistrationAccepted':False,'wholeT04Accepted':False,'phoneTested':False}
(root/'validation/f14-component-alpha-seam.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))

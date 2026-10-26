"""Lossless crops of the closer same-facing/down-arm donor. Source archive required."""
from pathlib import Path
import argparse,json,hashlib
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('source');a=p.parse_args();source=Path(a.source)
expected='56a79d4fa430d24396d3413c2f444e10e224d2e196fae9b87c72f9f1b5ddfeea';assert hashlib.sha256(source.read_bytes()).hexdigest()==expected,'wrong donor identity'
im=Image.open(source).convert('RGB');assert im.size==(1086,1448)
specs=[('near-down-shoulder',[800,390,1010,710],[[850,418],[895,420],[930,434],[955,454],[974,485],[982,535],[986,590],[990,665],[941,680],[916,642],[902,610],[873,581],[842,556],[827,530],[833,480],[843,450]]),('near-down-upper-arm',[890,580,1020,1030],[[922,600],[986,590],[990,665],[992,740],[993,830],[994,920],[999,1000],[936,1015],[923,940],[915,870],[908,800],[900,730],[898,660]])]
rows=[]
for name,rect,poly in specs:
 crop=im.crop(rect);local=[[x-rect[0],y-rect[1]] for x,y in poly];alpha=Image.new('L',crop.size);ImageDraw.Draw(alpha).polygon(local,fill=255);rgba=crop.convert('RGBA');rgba.putalpha(alpha)
 out=ROOT/'references/derived'/f'{name}-cutout.png';rgba.save(out);assert Image.open(out).convert('RGB').tobytes()==crop.tobytes()
 rows.append(dict(id=name,path=str(out.relative_to(ROOT)),sha256=hashlib.sha256(out.read_bytes()).hexdigest(),originalSourceSha256=expected,originalCropRect=rect,size=list(crop.size),alphaPolygonLocal=local,opaquePixels=sum(v>0 for v in alpha.tobytes()),rgbExactIncludingTransparentPixels=True,acceptedCrossViewRegistration=False,confidence=0,boundary='conservative manually traced subset; no invented hidden pixels'))
manifest=dict(version=1,independentDonorViews=1,newCameraAnglesClaimed=0,components=rows,sourcePose='same facing as main; near arm downward, unlike bent side-B elbow',registeredToMain=False)
(ROOT/'references/derived/near-down-cutout-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(ROOT/'references/derived/near-down-source.json').write_text(json.dumps(dict(sourceFile=source.name,sourceSha256=expected,sourceSize=list(im.size),sourceArchiveLibraryId='libfile_87b01f83278c8191a58ee9ac01bf06d4',cameraYawInferred=False),ensure_ascii=False,indent=2)+'\n')
canvas=Image.new('RGB',(750,720),(18,24,32));canvas.paste(im.resize((543,724)),(0,0));
for i,c in enumerate(rows):
 cut=Image.open(ROOT/c['path']);cut.thumbnail((200,340));canvas.paste(cut,(550,10+i*350),cut)
canvas.save(ROOT/'validation/f14-near-down-components.jpg',quality=92);print(json.dumps({'components':len(rows),'sourceSha256':expected,'newCameraAnglesClaimed':0}))

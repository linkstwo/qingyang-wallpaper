"""Trace archive sources and register a same-composition reference in 2D.

No cross-pose 3D texture is enabled by a small 2D matching residual.
Original image bytes are read-only. Optional archive remains outside Git.
"""
import argparse,hashlib,json
from pathlib import Path
import numpy as np
from PIL import Image,ImageChops,ImageDraw,ImageStat
from scipy.signal import correlate2d
ROOT=Path(__file__).resolve().parents[1]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def register(reference='front-variant.png',write=True):
 current=ROOT/'references/originals/main-reading-v2.png';ref=ROOT/'references/originals'/reference
 image=Image.open(current).convert('RGB');other=Image.open(ref).convert('RGB').resize(image.size,Image.Resampling.LANCZOS)
 a=np.asarray(image.convert('L'),dtype=float);b=np.asarray(other.convert('L'),dtype=float)
 # Only the character region contributes; paper/background matching cannot pass a body fit.
 import subprocess
 subject=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {subject} from './character-prototype/preview/subject.mjs';console.log(JSON.stringify(subject));"],cwd=ROOT,text=True))
 mask=Image.new('L',image.size);draw=ImageDraw.Draw(mask);draw.polygon([tuple(p) for p in subject['outline']],fill=255);draw.polygon([tuple(p) for p in subject['paper']],fill=0)
 mask=np.asarray(mask);matches=[];radius=17;search=6
 for y in range(100,image.height-80,90):
  for x in range(350,image.width-80,75):
   if not np.all(mask[y-radius:y+radius+1,x-radius:x+radius+1]):continue
   patch=a[y-radius:y+radius+1,x-radius:x+radius+1];centered=patch-patch.mean();var=np.sum(centered**2)
   if patch.std()<10:continue
   window=b[y-radius-search:y+radius+search+1,x-radius-search:x+radius+search+1]
   size=patch.size;ones=np.ones(patch.shape);total=correlate2d(window,ones,mode='valid');squares=correlate2d(window**2,ones,mode='valid')
   norm=np.sqrt(np.maximum(1e-12,squares-total**2/size)*var);scores=correlate2d(window,centered,mode='valid')/norm
   dy,dx=np.unravel_index(np.argmax(scores),scores.shape);score=float(scores[dy,dx])
   if score>.92:matches.append({'current':[x,y],'referenceScaled':[x+int(dx)-search,y+int(dy)-search],'correlation':score})
 if len(matches)<30:return {'status':'rejected','reference':reference,'matches':len(matches),'reason':'Fewer than30 same-composition subject patch matches. This does not establish a cross-view mapping.','hiddenTextureReady':False}
 train=[m for i,m in enumerate(matches) if i%3];held=[m for i,m in enumerate(matches) if not i%3]
 A=np.array([[*m['current'],1] for m in train]);B=np.array([m['referenceScaled'] for m in train]);M=np.linalg.lstsq(A,B,rcond=None)[0]
 def errors(items):return [float(np.linalg.norm(np.array([*m['current'],1])@M-m['referenceScaled'])) for m in items]
 err=errors(held);assert max(err)<2,'same-composition registration failed held-out check'
 w,h=Image.open(ref).size;sx=w/image.width;sy=h/image.height
 source_matrix=(M*np.array([sx,sy])).T.tolist()
 result={'schemaVersion':1,'status':'accepted_2d_only','kind':'same_composition_2d','current':{'path':str(current.relative_to(ROOT)),'sha256':digest(current),'size':list(image.size)},'reference':{'path':str(ref.relative_to(ROOT)),'sha256':digest(ref),'size':[w,h]},'sourcePixelFromCurrentPixelAffine':source_matrix,'matches':matches,'trainPoints':len(train),'heldOutPoints':len(held),'heldOutMaxErrorCurrentPixels':max(err),'heldOutMeanErrorCurrentPixels':float(np.mean(err)),'matchingResolutionPixels':1,'precisionNote':'Residual measures the integer patch grid fit, not subpixel localisation accuracy or 3D reconstruction.','rgbMeanDifferenceResized':sum(ImageStat.Stat(ImageChops.difference(image,other)).mean)/3,'crossView3dRegistered':False,'hiddenTextureReady':False,'productionSourceChanged':False,'phoneTested':False}
 if not write:return result
 (ROOT/'validation/s1-reading-source-registration.json').write_text(json.dumps(result,indent=2)+'\n')
 canvas=Image.new('RGB',(864,606),'#141b24');d=ImageDraw.Draw(canvas)
 for i,im in enumerate([image,other]):
  im=im.resize((432,576));canvas.paste(im,(i*432,30))
  for m in matches:
   p=m['current'] if i==0 else m['referenceScaled'];x=i*432+p[0]*.375;y=30+p[1]*.375;d.ellipse((x-2,y-2,x+2,y+2),fill='#69ffd5')
  d.text((i*432+8,8),['current reading source','existing reference, 2D fit only'][i],fill='white')
 canvas.save(ROOT/'validation/s1-reading-source-registration.jpg',quality=90)
 return result
def inventory(folder):
 known=list((ROOT/'references/originals').glob('*.png'));expected=json.loads((ROOT/'references/multiview-archive-manifest.json').read_text());paths={p.name:p for p in folder.glob('*.png')};rows=[]
 for entry in expected['files']:
  p=paths[entry['name']];assert digest(p)==entry['sha256'] and p.stat().st_size==entry['bytes']
  im=Image.open(p).convert('RGB');assert list(im.size)==entry['size']
  equivalents=[str(k.relative_to(ROOT)) for k in known if Image.open(k).size==im.size and ImageChops.difference(im,Image.open(k).convert('RGB')).getbbox() is None]
  rows.append({**entry,'pixelReviewComplete':True,'exactPixelEquivalentPaths':equivalents})
 expected.update(files=rows,pixelReviewComplete=True,exactPixelEquivalentsInGit=sum(bool(r['exactPixelEquivalentPaths']) for r in rows),additionalCompositions=sum(not r['exactPixelEquivalentPaths'] for r in rows),registeredMultiview=False,reviewNote='All10 whole images reviewed. Six extra compositions vary head, arm, body orientation or clothing; archive count is not calibrated viewpoint count.')
 (ROOT/'references/multiview-archive-manifest.json').write_text(json.dumps(expected,ensure_ascii=False,indent=2)+'\n')
 return expected
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--archive',type=Path);args=p.parse_args();r=register()
 if args.archive:inv=inventory(args.archive);print(json.dumps({'archiveReviewed':len(inv['files']),'exactExistingCompositions':inv['exactPixelEquivalentsInGit'],'additionalCompositions':inv['additionalCompositions']}))
 print(json.dumps({k:r[k] for k in ['trainPoints','heldOutPoints','heldOutMaxErrorCurrentPixels','heldOutMeanErrorCurrentPixels','rgbMeanDifferenceResized','hiddenTextureReady']}))

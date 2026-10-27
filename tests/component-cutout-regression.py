from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
m=json.loads((ROOT/'references/derived/side-b-cutout-manifest.json').read_text())
rows=[]
for c in m['components']:
 raw=(ROOT/c['path']).read_bytes();assert hashlib.sha256(raw).hexdigest()==c['sha256']
 original=Image.open(ROOT/c['cropPath']).convert('RGB');cut=Image.open(ROOT/c['path']).convert('RGBA')
 assert cut.size==original.size and cut.convert('RGB').tobytes()==original.tobytes()
 alpha=cut.getchannel('A');assert set(alpha.tobytes())=={0,255}
 # Independently chosen observed skin and external workshop-background controls.
 skin,background=([(150,160),(60,140)],[(220,20),(150,30)])
 i=0 if 'nape' in c['id'] else 1
 assert alpha.getpixel(skin[i])==255 and alpha.getpixel(background[i])==0
 tampered=bytearray(raw);tampered[-20]^=1;assert hashlib.sha256(tampered).hexdigest()!=c['sha256']
 rows.append({'path':c['path'],'rgbExact':True,'opaqueSkinControl':skin[i],'transparentBackgroundControl':background[i],'wrongBytesRejected':True,'opaquePixels':sum(v>0 for v in alpha.tobytes())})
(ROOT/'validation/f13-component-cutouts.json').write_text(json.dumps({'rows':rows,'registeredToMain':False,'phoneTested':False},indent=2)+'\n')
print(json.dumps(rows))

"""Source archive bytes required; no reconstruction of missing source pixels."""
from pathlib import Path
import sys,json,hashlib
from PIL import Image
root=Path(__file__).resolve().parents[1];source=Path(sys.argv[1]);identity=json.loads((root/'references/derived/near-down-source.json').read_text());manifest=json.loads((root/'references/derived/near-down-cutout-manifest.json').read_text())
assert hashlib.sha256(source.read_bytes()).hexdigest()==identity['sourceSha256'];im=Image.open(source).convert('RGB');assert list(im.size)==identity['sourceSize'];rows=[]
for c in manifest['components']:
 path=root/c['path'];assert hashlib.sha256(path.read_bytes()).hexdigest()==c['sha256'];rgba=Image.open(path).convert('RGBA');crop=im.crop(c['originalCropRect']);assert rgba.convert('RGB').tobytes()==crop.tobytes();alpha=rgba.getchannel('A');assert set(alpha.tobytes())=={0,255};assert sum(v>0 for v in alpha.tobytes())==c['opaquePixels'];assert c['originalSourceSha256']==identity['sourceSha256'];rows.append({'id':c['id'],'rgbExactIncludingTransparentPixels':True,'opaquePixels':c['opaquePixels'],'sourceCrop':c['originalCropRect']})
bad=bytearray(source.read_bytes());bad[-30]^=1;assert hashlib.sha256(bad).hexdigest()!=identity['sourceSha256'],'tamper control'
(root/'validation/f14-near-down-source.json').write_text(json.dumps({'rows':rows,'sourceSha256':identity['sourceSha256'],'sourceSize':identity['sourceSize'],'tamperNegative':True,'newCameraAnglesClaimed':0,'registeredToMain':False,'phoneTested':False},indent=2)+'\n');print('Near/down donor: exact archive hash, RGB at all pixels including transparent, alpha counts and source tamper control passed')

"""Losslessly split a verified donor view into independent authoring patches."""
from pathlib import Path
from PIL import Image
import hashlib,json,sys
ROOT=Path(__file__).resolve().parents[1];source=Path(sys.argv[1]);raw=source.read_bytes()
expected='23a8985745ee4fb33a22f6a210eb6cc0f8a3c52224fcb7c577ff66b601063b16'
assert hashlib.sha256(raw).hexdigest()==expected,'Wrong donor source; refusing crop'
im=Image.open(source).convert('RGB');assert im.size==(1086,1448)
rows=[]
for name,box,use in [('side-b-nape-shoulder',(650,300,900,500),'nape/strap local authoring; contains background and hair, no accepted cross-view registration'),('side-b-upper-arm',(790,410,945,640),'bent-arm upper shoulder cap; pose differs, never transfer as the supported arm')]:
    crop=im.crop(box);path=ROOT/'references/derived'/(name+'.png');crop.save(path)
    restored=Image.open(path).convert('RGB');assert restored.tobytes()==crop.tobytes()
    rows.append(dict(id=name,path=str(path.relative_to(ROOT)),sourceFile=source.name,sourceSha256=expected,cropRect=list(box),size=list(crop.size),outputSha256=hashlib.sha256(path.read_bytes()).hexdigest(),rgbExact=True,resampled=False,mirrored=False,confidence=0,registrationAccepted=False,use=use))
result=dict(version=1,independentSourceViews=1,newCameraAnglesClaimed=0,components=rows,reason='Neck/strap/outer-shoulder candidate triangle reverses orientation; split authoring patches before trying local corrections.')
(ROOT/'references/derived/side-b-component-manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))

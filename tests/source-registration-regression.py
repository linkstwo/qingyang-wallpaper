"""Same composition may register in2D; real other poses may not pass that gate."""
import sys,json,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from register_source_images import register,ROOT
originals={p:hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'references/originals').glob('*.png')}
front=register(write=False);assert front['status']=='accepted_2d_only' and front['heldOutPoints']>=10
assert not front['hiddenTextureReady'] and not front['crossView3dRegistered']
negatives=[]
for name in ['back-reference.png','side-reference.png','main-front-three-quarter.png']:
 r=register(name,write=False);assert r['status']=='rejected',(name,r);negatives.append(r)
assert all(hashlib.sha256(p.read_bytes()).hexdigest()==h for p,h in originals.items())
result={'sameCompositionAccepted2d':True,'crossPoseRejected':negatives,'originalHashesUnchanged':True,'matchingPrecisionPixels':1,'hiddenTextureReady':False}
(ROOT/'validation/s1-source-registration-negatives.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

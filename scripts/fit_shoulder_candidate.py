"""Fit a reversible local similarity from observed neck/strap candidates.
This is an authoring seed, not accepted anatomical or camera calibration.
"""
from pathlib import Path
import json, math, hashlib
ROOT=Path(__file__).resolve().parents[1]
points=json.loads((ROOT/'references/shoulder-source-candidates-20261027.json').read_text())
crop=json.loads((ROOT/'references/derived/side-b-shoulder-back.json').read_text())
for path,expected in [('references/originals/main-reading-v2.png',points['main']['sha256']), (crop['output'],crop['outputSha256'])]:
    assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==expected,'wrong source identity'
assert points['sideB']['sha256']==crop['sourceSha256']
anchors=['frameRightNeckBase','frameRightStrapAtShoulder']
p,q=[complex(*points['sideB']['points'][k]) for k in anchors]
u,v=[complex(*points['main']['points'][k]) for k in anchors]
assert abs(q-p)>10
scale=(v-u)/(q-p);offset=u-scale*p
cx,cy=crop['cropRect'][:2];crop_offset=offset+scale*complex(cx,cy)
transform=lambda xy: scale*complex(*xy)+offset
residuals={}
for name,xy in points['sideB']['points'].items():
    prediction=transform(xy);actual=complex(*points['main']['points'][name])
    residuals[name]={'fittedAnchor':name in anchors,'predictedMain':[prediction.real,prediction.imag],'observedMain':[actual.real,actual.imag],'residualPixels':abs(prediction-actual),'insideCrop':cx<=xy[0]<crop['cropRect'][2] and cy<=xy[1]<crop['cropRect'][3]}
result={'version':1,'source':crop['output'],'sourceSha256':crop['outputSha256'],'target':points['main']['path'],'targetSha256':points['main']['sha256'],'method':'two-point orientation-preserving similarity, no mirror','fitAnchors':anchors,'cropToMainRowMajor2x3':[[scale.real,-scale.imag,crop_offset.real],[scale.imag,scale.real,crop_offset.imag]],'scale':abs(scale),'imagePlaneRotationRadians':math.atan2(scale.imag,scale.real),'cameraYawInferred':False,'residuals':residuals,'observationErrorPerImagePixels':30,'confidence':0,'accepted':False,'limitations':['Two fitted anchors have zero residual by construction; they are not validation.','Held-out shoulder/ear differences can reflect pose or landmark ambiguity; refine observations before registration.','Ear lies outside this crop and is not a texture provider here.','Do not transfer the whole bent arm or treat this image-plane transform as a camera angle.']}
path=ROOT/'references/derived/shoulder-side-b-similarity-candidate.json';path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'scale':result['scale'],'heldOutResidualPixels':{k:v['residualPixels'] for k,v in residuals.items() if not v['fittedAnchor']},'accepted':False}))

"""Check nonlocal observed-body crossings; positive projected area is insufficient.
Reuses independently fixture-tested intersection code. Does not test paper/body
occlusion contacts, hidden rear surfaces, swept motion, or final raster visibility.
"""
from pathlib import Path
import subprocess,json,time
import numpy as np
from PIL import Image
from scan_structural_intersections import fixtures,intersections
ROOT=Path(__file__).resolve().parents[1]
fixtures();mask=np.asarray(Image.open(ROOT/'character-prototype/preview/mask.png').convert('L'));results=[]
for volume in [False,True]:
    script="""import {buildObservedScene} from './character-prototype/preview/observed-scene.mjs';import {poseConnectedProxy} from './character-prototype/preview/structural-pose.mjs';const m=buildObservedScene({forearmVolume:VOLUME,paperPartition:true,paperLapContact:true,seatSupport:true,lapContactWidth:96}).body;const inputs=[{}, {yaw:-.059,pitch:-.04,roll:.034}, {yaw:.059,pitch:.04,roll:-.034}];console.log(JSON.stringify({uv:m.uv,rest:m.positions,frames:inputs.map(input=>({input,positions:poseConnectedProxy(m,input).positions}))}));""".replace('VOLUME',str(volume).lower())
    data=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=ROOT,text=True));uv=np.array(data['uv']).reshape(-1,2)*[1152,1536];rest=np.array(data['rest']).reshape(-1,3)
    tri_uv=uv.reshape(-1,3,2);center=tri_uv.mean(axis=1,keepdims=True);samples=np.concatenate([tri_uv,center],axis=1);px=np.rint(samples).astype(int);px[:,:,0]=px[:,:,0].clip(0,1151);px[:,:,1]=px[:,:,1].clip(0,1535)
    opaque=(mask[px[:,:,1],px[:,:,0]]>=254).all(axis=1)
    e1=tri_uv[:,1]-tri_uv[:,0];e2=tri_uv[:,2]-tri_uv[:,0];area=np.abs(e1[:,0]*e2[:,1]-e1[:,1]*e2[:,0])/2
    selected=np.flatnonzero(opaque&(area>=.01));mapping={};canonical=[];first=[]
    for i,p in enumerate(rest):
        key=tuple(np.round(p,7))
        if key not in mapping:mapping[key]=len(first);first.append(i)
        canonical.append(mapping[key])
    ids=np.array(canonical).reshape(-1,3)[selected]
    for frame in data['frames']:
        started=time.monotonic();points=np.array(frame['positions']).reshape(-1,3)[first];report=intersections(points,ids)
        results.append(dict(forearmVolume=volume,input=frame['input'],testedTriangles=len(selected),**report,elapsedSeconds=time.monotonic()-started));print(json.dumps(results[-1]),flush=True)
result=dict(source='observed front body, not rear proxy',lapContactWidth=96,seatSupport=True,matteFilter='all source vertices and centroid>=254, source area>=0.01px²; not raster visibility',neighbours='rest positions rounded to 1e-7 world units share indices; adjacent triangles excluded',fixtures=5,frames=results,continuousCollisionDetection=False,wholeT05Accepted=False,phoneTested=False)
(ROOT/'validation/observed-self-intersections-lap96.json').write_text(json.dumps(result,indent=2)+'\n')
raise SystemExit(1 if any(r['intersections'] for r in results) else 0)

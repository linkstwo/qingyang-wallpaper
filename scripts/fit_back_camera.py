"""Provisional camera fit to manually inferred back-section rails.

Residual is agreement with the proxy/chart assumptions, NOT observed3D accuracy.
Held-out rails expose whether a single camera explains this chart before UV use.
"""
import json,math,subprocess
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from scipy.optimize import least_squares
ROOT=Path(__file__).resolve().parents[1]
script="""import {sceneModel,unprojectSource} from './character-prototype/preview/scene-model.mjs';
import {backChartAt} from './character-prototype/preview/material-chart.mjs';
const samples=[];for(const [row,y] of [530,650,790,945,1090].entries()){
 const ss=sceneModel.sections;let i=0;while(i<ss.length-2&&y>ss[i+1].y)i++;const a=ss[i],b=ss[i+1],t=(y-a.y)/(b.y-a.y),s=Object.fromEntries(['cx','rx','cz','rz'].map(k=>[k,a[k]+(b[k]-a[k])*t]));
 for(const u of [-.8,0,.8]){const p=unprojectSource(s.cx+s.rx*u,y,s.cz-s.rz*Math.sqrt(1-u*u)),q=backChartAt(p,1);if(!q.candidate)throw Error('chart sample missing');samples.push({row,y,u,p,source:q.uv.map((x,k)=>x*[1086,1448][k]),heldOut:row%2===1});}}
console.log(JSON.stringify(samples));"""
samples=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=ROOT,text=True))
points=np.array([s['p'] for s in samples]);targets=np.array([s['source'] for s in samples]);train=np.array([not s['heldOut'] for s in samples])
def project(params,points=points):
 yaw,pitch,roll,logscale,tx,ty=params;cy,sy=math.cos(yaw),math.sin(yaw);cx,sx=math.cos(pitch),math.sin(pitch);cz,sz=math.cos(roll),math.sin(roll)
 x=cy*points[:,0]+sy*points[:,2];z=-sy*points[:,0]+cy*points[:,2];y=cx*points[:,1]-sx*z;Z=sx*points[:,1]+cx*z
 q=np.stack([cz*x-sz*y,sz*x+cz*y],axis=1);w=(2300-Z)/2300
 return q/w[:,None]*math.exp(logscale)+np.array([tx,ty])
fits=[]
for yaw in [2.1,math.pi,4.2]:
 fit=least_squares(lambda p:(project(p)[train]-targets[train]).ravel(),[yaw,0,0,0,500,1100],bounds=([math.pi/2,-.8,-.6,-1,-1000,-1000],[math.pi*1.5,.8,.6,1,2000,2000]),xtol=1e-12,ftol=1e-12,gtol=1e-12,max_nfev=3000)
 fits.append(fit)
best=min(fits,key=lambda f:np.sum(f.fun**2));predicted=project(best.x);errors=np.linalg.norm(predicted-targets,axis=1)
singular=np.linalg.svd(best.jac,compute_uv=False)
result={'status':'provisional_rejected_for_production','constraintKind':'manual inferred section rails; not independently matched photographic3D landmarks','source':'references/originals/back-reference.png','params':dict(zip(['yaw','pitch','roll','logScale','translateX','translateY'],best.x.tolist())),'trainingRmsSourcePixels':float(np.sqrt(np.mean(errors[train]**2))),'heldOutRmsSourcePixels':float(np.sqrt(np.mean(errors[~train]**2))),'heldOutMaxSourcePixels':float(max(errors[~train])),'jacobianSingularValues':singular.tolist(),'samples':[{**s,'projected':q.tolist(),'error':float(e)} for s,q,e in zip(samples,predicted,errors)],'productionConfidence':0,'cameraUsedByProduction':False,'limitations':['Targets come from provisional chart rails, so low residual cannot validate identity or garment alignment.','Neck/shoulder/arm poses and hidden body require independent observations.','No production camera range expansion or original-photo replacement.'],'phoneTested':False}
(ROOT/'validation/s2-back-camera-fit.json').write_text(json.dumps(result,indent=2)+'\n')
im=Image.open(ROOT/result['source']).convert('RGB');d=ImageDraw.Draw(im)
for s,q,e in zip(samples,predicted,errors):
 x,y=s['source'];color='#ffcb55' if s['heldOut'] else '#70ffe4';d.ellipse((x-5,y-5,x+5,y+5),outline=color,width=2);d.line((x,y,*q),fill=color,width=2);d.line((q[0]-4,q[1],q[0]+4,q[1]),fill='#ff4090',width=2);d.line((q[0],q[1]-4,q[0],q[1]+4),fill='#ff4090',width=2)
im.thumbnail((543,724));im.save(ROOT/'validation/s2-back-camera-fit.jpg',quality=91)
print(json.dumps({k:result[k] for k in ['status','params','trainingRmsSourcePixels','heldOutRmsSourcePixels','heldOutMaxSourcePixels','productionConfidence']}))

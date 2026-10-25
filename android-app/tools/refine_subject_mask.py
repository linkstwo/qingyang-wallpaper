"""Derive an aligned motion matte; source RGB stays byte-for-byte unchanged.
Requires opencv-python-headless, numpy and Pillow, only when regenerating assets.
Fine flyaways use a bounded manually observed envelope, not individual strand simulation.
"""
from pathlib import Path
import json,subprocess
import cv2,numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];P=ROOT/'character-prototype/preview'
s=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {subject} from './character-prototype/preview/subject.mjs';console.log(JSON.stringify(subject));"],cwd=ROOT,text=True))
rgb=np.array(Image.open(P/'original.png').convert('RGB'));h,w=rgb.shape[:2]
coarse=np.zeros((h,w),np.uint8);cv2.fillPoly(coarse,[np.array(s['outline'],np.int32)],255)
inside=cv2.distanceTransform(coarse,cv2.DIST_L2,5);outside=cv2.distanceTransform(255-coarse,cv2.DIST_L2,5)
mask=np.where(coarse>0,cv2.GC_PR_FGD,cv2.GC_PR_BGD).astype(np.uint8);mask[inside>55]=cv2.GC_FGD;mask[outside>65]=cv2.GC_BGD
for region in s['contacts']:cv2.fillPoly(mask,[np.array(region['outline'],np.int32)],cv2.GC_FGD)
mask[1410:,:]=cv2.GC_FGD;cv2.setRNGSeed(58)
cv2.grabCut(cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR),mask,None,np.zeros((1,65)),np.zeros((1,65)),5,cv2.GC_INIT_WITH_MASK)
matte=np.where((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD),255,0).astype(np.uint8)
matte=cv2.morphologyEx(matte,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8));cv2.fillPoly(matte,[np.array(s['hair']['outline'],np.int32)],255)
Image.fromarray(matte).convert('RGB').save(P/'mask.png');print('Aligned motion matte saved; original RGB unchanged.')

"""Nonlocal surface intersections after supported skinning; sampled, not swept CCD.

Triangle area/orientation alone cannot exclude two distant surface parts crossing.
Broad phase uses a spatial hash; narrow phase checks both edge/triangle directions
and coplanar 2D separating axes. Shared-vertex neighbours are intentionally excluded.
"""
import itertools,json,math,subprocess,time
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
def narrow(a,b):
 hit=np.zeros(len(a),dtype=bool)
 def edge_hits(x,y):
  nonlocal hit
  e1=y[:,1]-y[:,0];e2=y[:,2]-y[:,0]
  for k in range(3):
   origin=x[:,k];direction=x[:,(k+1)%3]-origin;h=np.cross(direction,e2);det=np.einsum('ij,ij->i',e1,h)
   good=np.abs(det)>1e-12*np.maximum(1,np.linalg.norm(e1,axis=1)*np.linalg.norm(h,axis=1));inv=np.zeros(len(a));inv[good]=1/det[good]
   s=origin-y[:,0];u=inv*np.einsum('ij,ij->i',s,h);q=np.cross(s,e1);v=inv*np.einsum('ij,ij->i',direction,q);t=inv*np.einsum('ij,ij->i',e2,q)
   hit|=good&(u>1e-8)&(v>1e-8)&(u+v<1-1e-8)&(t>1e-8)&(t<1-1e-8)
 edge_hits(a,b);edge_hits(b,a)
 na=np.cross(a[:,1]-a[:,0],a[:,2]-a[:,0]);nb=np.cross(b[:,1]-b[:,0],b[:,2]-b[:,0]);la=np.linalg.norm(na,axis=1);lb=np.linalg.norm(nb,axis=1)
 unit=na/np.maximum(la[:,None],1e-20)
 coplanar=(la>1e-12)&(lb>1e-12)&(np.linalg.norm(np.cross(na,nb),axis=1)<1e-9*la*lb)&(np.abs(np.einsum('ij,ij->i',b[:,0]-a[:,0],unit))<1e-7)
 for axis in range(3):
  ids=np.flatnonzero(coplanar&(np.argmax(np.abs(na),axis=1)==axis))
  if not len(ids):continue
  aa=np.delete(a[ids],axis,axis=2);bb=np.delete(b[ids],axis,axis=2);overlap=np.ones(len(ids),dtype=bool)
  for triangle in [aa,bb]:
   for k in range(3):
    edge=triangle[:,(k+1)%3]-triangle[:,k];normal=np.stack([-edge[:,1],edge[:,0]],axis=1);A=np.einsum('ijk,ik->ij',aa,normal);B=np.einsum('ijk,ik->ij',bb,normal)
    # Boundary contact alone is not a crossing of open nonadjacent surfaces.
    overlap&=(np.minimum(A.max(axis=1),B.max(axis=1))-np.maximum(A.min(axis=1),B.min(axis=1))>1e-8)
  hit[ids]|=overlap
 return hit

def intersections(points,indices,cell=24):
 tris=points[indices];lo=tris.min(axis=1);hi=tris.max(axis=1);bins={}
 for i,(a,b) in enumerate(zip(np.floor(lo/cell).astype(int),np.floor(hi/cell).astype(int))):
  for key in itertools.product(*(range(a[k],b[k]+1) for k in range(3))):bins.setdefault(key,[]).append(i)
 blocks=[];N=len(tris)
 for ids in bins.values():
  if len(ids)<2:continue
  ids=np.array(ids,dtype=np.int64);a,b=np.triu_indices(len(ids),1);blocks.append(ids[a]*N+ids[b])
 pairs=np.unique(np.concatenate(blocks));i=pairs//N;j=pairs%N
 valid=np.all(np.maximum(lo[i],lo[j])<=np.minimum(hi[i],hi[j])+1e-8,axis=1)
 for k in range(3):
  for l in range(3):valid&=indices[i,k]!=indices[j,l]
 i=i[valid];j=j[valid];collisions=[]
 for start in range(0,len(i),20000):
  end=start+20000;hits=narrow(tris[i[start:end]],tris[j[start:end]])
  collisions.extend(zip(i[start:end][hits].tolist(),j[start:end][hits].tolist()))
 return {'candidatePairs':len(i),'intersections':len(collisions),'examples':collisions[:12]}

def fixtures():
 a=np.array([[[0,0,0],[2,0,0],[0,2,0]]],dtype=float)
 for b,expected in [([[.4,.4,-1],[.4,.4,1],[1,.4,.5]],True),([[3,3,-1],[3,3,1],[4,3,.5]],False),([[.2,.2,0],[1,.2,0],[.2,1,0]],True),([[2,2,0],[3,2,0],[2,3,0]],False),([[2,0,0],[2,2,0],[3,0,0]],False)]:
  assert bool(narrow(a,np.array([b],dtype=float))[0])==expected

if __name__=='__main__':
 fixtures();started=time.monotonic()
 script="""import {buildConnectedProxy} from './character-prototype/preview/connected-proxy.mjs';
import {poseConnectedProxy} from './character-prototype/preview/structural-pose.mjs';
const m=buildConnectedProxy(),frames=[];for(let i=0;i<17;i++){const t=i/16*Math.PI*2,input={yaw:.06*Math.sin(t),pitch:.04*Math.sin(t*2),roll:.035*Math.cos(t)};frames.push({t,input,positions:poseConnectedProxy(m,input).positions});}
for(const yaw of [-.06,.06])for(const pitch of [-.04,.04])for(const roll of [-.035,.035]){const input={yaw,pitch,roll};frames.push({input,positions:poseConnectedProxy(m,input).positions});}
console.log(JSON.stringify({indices:m.indices,frames}));"""
 data=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=ROOT,text=True));indices=np.array(data['indices']).reshape(-1,3);results=[]
 for n,frame in enumerate(data['frames']):
  points=np.array(frame.pop('positions')).reshape(-1,3);r=intersections(points,indices);results.append({**frame,**r});print(json.dumps({'frame':n,**r}),flush=True)
 result={'sampledPoses':len(results),'fixtures':5,'totalCandidatePairs':sum(r['candidatePairs'] for r in results),'nonlocalIntersections':sum(r['intersections'] for r in results),'frames':results,'method':'spatial hash, bidirectional segment/triangle plus coplanar2D SAT','continuousCollisionDetection':False,'sharedVertexNeighboursExcluded':True,'elapsedSeconds':time.monotonic()-started,'phoneTested':False}
 (ROOT/'validation/s2-self-intersections.json').write_text(json.dumps(result,indent=2)+'\n')
 assert result['nonlocalIntersections']==0,json.dumps(result)
 print(json.dumps({k:v for k,v in result.items() if k!='frames'}))

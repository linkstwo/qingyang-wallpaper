"""Deterministic lease/checkpoint proposals. No credentials, network or background daemon.
Read JSON on stdin; caller must persist proposals with an atomic remote HEAD comparison.
"""
import argparse,datetime as dt,hashlib,json,re,subprocess
from pathlib import Path
TTL=900
REPO='linkstwo/qingyang-wallpaper'
BRANCH='feature/cloud-framing-response'
SHA=re.compile(r'^[0-9a-f]{40}$')
def time(s):
 d=dt.datetime.fromisoformat(s.replace('Z','+00:00'))
 if d.tzinfo is None:raise ValueError('timezone is required')
 return d.astimezone(dt.timezone.utc)
def iso(t):return t.isoformat().replace('+00:00','Z')
def safe_path(s):
 p=Path(s)
 if p.is_absolute() or '..' in p.parts or not p.parts:raise ValueError('unsafe relative path')
 if any(part in ['.git','.gradle','node_modules'] for part in p.parts):raise ValueError('generated/private path')
 if p.suffix.lower() in ['.keystore','.jks','.p12','.pem','.key'] or p.name in ['signing.properties','local.properties'] or p.name.startswith('.env'):raise ValueError('private file excluded')
 return p

def inspect(q):
 now=time(q['now']);state=q.get('state',{});lease=q.get('lease')
 if q.get('repository',REPO)!=REPO or q.get('branch',BRANCH)!=BRANCH:raise ValueError('plugin is scoped to the Qingyang branch')
 if not SHA.fullmatch(q['head']):raise ValueError('remote HEAD must be an actual Git SHA')
 if q.get('runMode','manual')=='scheduled':
  window=q.get('authorizedWindow')
  if not window:return {'decision':'needs_schedule_scope','reason':'No authorised schedule window supplied; do not create or extend one.'}
  if not time(window['start'])<=now<time(window['end']):return {'decision':'outside_window','reason':'Preserve the user-authorised schedule end.'}
 if state.get('stopRequested') or (state.get('currentStage')=='S8' and state.get('status')=='complete'):return {'decision':'finished','reason':'User stopped or S8 is recorded complete; verify acceptance before reporting.'}
 if lease:
  if lease.get('schemaVersion')!=1 or type(lease.get('fence')) is not int or lease['fence']<1:raise ValueError('invalid lease schema/fence')
  if lease.get('status') not in ['running','released'] or not isinstance(lease.get('owner'),str) or not lease['owner']:raise ValueError('invalid lease status/owner')
  heartbeat=time(lease['heartbeatAt']);expires=time(lease['expiresAt'])
  if time(lease['startedAt'])>heartbeat:raise ValueError('lease starts after heartbeat')
  if heartbeat>now+dt.timedelta(seconds=60):raise ValueError('lease clock is in the future')
  if expires<heartbeat or expires>heartbeat+dt.timedelta(seconds=TTL):raise ValueError('lease TTL must be at most15minutes')
  if lease.get('status')=='running' and now<expires:
   return {'decision':'owned' if lease['owner']==q.get('owner') and lease['fence']==q.get('fence') else 'busy','owner':lease['owner'],'fence':lease['fence'],'expiresAt':lease['expiresAt']}
 return {'decision':'resumable','reason':'No live lease; historical in_progress/no release is not a permanent lock. Claim with remote CAS before writing.','stage':state.get('currentStage'),'next':state.get('next',[])}

def transition(action,q):
 status=inspect(q);lease=q.get('lease');now=time(q['now']);out={**status,'expectedHead':q['head']}
 if action=='inspect':return out
 if action=='claim':
  if status['decision']=='owned':return {**out,'lease':lease,'writeRequired':False}
  if status['decision']!='resumable':return out
  if not q.get('owner') or len(q['owner'])>128:raise ValueError('use a unique bounded run owner')
  fence=(lease or {}).get('fence',0)+1
  new={'schemaVersion':1,'owner':q['owner'],'fence':fence,'status':'running','startedAt':iso(now),'heartbeatAt':iso(now),'expiresAt':iso(now+dt.timedelta(seconds=TTL)),'baseHead':q['head']}
  return {**out,'decision':'claim_proposed','lease':new,'writeRequired':True,'instruction':'CAS commit the lease; success and reread are required before editing.'}
 if status['decision']!='owned':return {**out,'decision':'ownership_lost','writeRequired':False}
 if now<time(lease['heartbeatAt']):raise ValueError('heartbeat time cannot move backwards')
 new=dict(lease)
 if action=='release':new.update(status='released',heartbeatAt=iso(now),expiresAt=iso(now),reason=q.get('reason','checkpointed'))
 elif action in ['heartbeat','checkpoint']:
  new.update(heartbeatAt=iso(now),expiresAt=iso(now+dt.timedelta(seconds=TTL)))
  if action=='checkpoint':
   receipt=q['receipt'];verify_receipt(receipt)
   if time(receipt['createdAt'])>now+dt.timedelta(seconds=60):raise ValueError('receipt timestamp is in the future')
   if receipt['owner']!=q['owner'] or receipt['fence']!=q['fence']:raise ValueError('receipt owner/fence mismatch')
   if receipt['baseHead']!=q['head']:raise ValueError('receipt must bind the current remote base HEAD')
   new['checkpoint']={'baseHead':receipt['baseHead'],'createdAt':receipt['createdAt'],'sourceDigest':receipt['sourceDigest'],'stage':receipt['stage'],'next':receipt['next']}
 else:raise ValueError('unknown action')
 return {**out,'decision':action+'_proposed','lease':new,'writeRequired':True,'instruction':'CAS on expectedHead, reread on conflict; never overwrite another owner.'}

def verify_receipt(r):
 if r.get('schemaVersion')!=1 or not SHA.fullmatch(r['baseHead']):raise ValueError('invalid receipt schema/base')
 time(r['createdAt'])
 if not isinstance(r.get('owner'),str) or not r['owner'] or type(r.get('fence')) is not int or r['fence']<1:raise ValueError('invalid receipt owner/fence')
 if not re.fullmatch('S[1-8]',r['stage']) or not r.get('next'):raise ValueError('actual stage and next action required')
 files=r.get('files',[])
 if not files:raise ValueError('checkpoint needs changed file evidence')
 for f in files:
  safe_path(f['path'])
  if not re.fullmatch('[0-9a-f]{64}',f['sha256']):raise ValueError('invalid file digest')
 digest=hashlib.sha256(json.dumps(files,sort_keys=True,separators=(',',':')).encode()).hexdigest()
 if digest!=r['sourceDigest']:raise ValueError('source evidence digest mismatch')
 for t in r.get('tests',[]):
  if not t.get('command') or t.get('status') not in ['passed','failed','not_run']:raise ValueError('invalid test evidence')
  if t['status']=='passed' and t.get('exitCode')!=0:raise ValueError('passing test needs real zero exit code')
 return True

def snapshot(root,q):
 root=Path(root).resolve();files=[]
 # Explicit paths only. Do not stage a directory or collect credentials/caches.
 for name in sorted(set(q['paths'])):
  rel=safe_path(name);p=(root/rel).resolve()
  if not p.is_relative_to(root):raise ValueError('path escapes checkout')
  if not p.is_file():raise ValueError('checkpoint file missing; record deletions separately in Git')
  b=p.read_bytes()
  if b'-----BEGIN PRIVATE KEY-----' in b:raise ValueError('private key content')
  files.append({'path':str(rel),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
 r={'schemaVersion':1,'owner':q['owner'],'fence':q['fence'],'baseHead':q['head'],'createdAt':q['now'],'stage':q['stage'],'files':files,'tests':q.get('tests',[]),'next':q['next'],'phoneTested':False,'sourceDigest':hashlib.sha256(json.dumps(files,sort_keys=True,separators=(',',':')).encode()).hexdigest()}
 verify_receipt(r);return r

def main():
 p=argparse.ArgumentParser();p.add_argument('action',choices=['inspect','claim','heartbeat','checkpoint','release','snapshot','verify']);p.add_argument('--root');a=p.parse_args();q=json.load(__import__('sys').stdin)
 result=snapshot(a.root,q) if a.action=='snapshot' else {'valid':verify_receipt(q)} if a.action=='verify' else transition(a.action,q)
 print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':main()

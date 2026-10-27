"""Executable private-plugin recovery/coordination regression; local Git only."""
from pathlib import Path
import datetime as dt,importlib.util,json,subprocess,tempfile,shutil
ROOT=Path(__file__).resolve().parents[1];SCRIPT=ROOT/'scripts/qingyang-continuation/skills/qingyang-continue/scripts/control.py'
spec=importlib.util.spec_from_file_location('control',SCRIPT);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
checks=0

def check(value,message):
 global checks
 assert value,message;checks+=1

def reject(fn,message):
 try:fn()
 except (ValueError,KeyError):check(True,message);return
 raise AssertionError(message)
q={'head':'a'*40,'now':'2026-10-26T01:00:00Z','owner':'run-a','state':{'currentStage':'S2','status':'in_progress','workSession':{'mode':'active_development'},'next':['continue structure']},'lease':None}
a=m.transition('claim',q)['lease'];check(a['fence']==1,'first fence')
check(m.transition('claim',{**q,'owner':'run-b','lease':a})['decision']=='busy','no parallel writer')
owned={**q,'lease':a,'fence':1};check(m.transition('heartbeat',owned)['decision']=='heartbeat_proposed','owner can renew')
check(m.transition('claim',owned)['writeRequired'] is False,'idempotent same-owner claim')
expired={**q,'now':'2026-10-26T01:16:00Z','lease':a,'owner':'run-b'}
b=m.transition('claim',expired)['lease'];check(b['fence']==2,'expired legacy lease is recoverable without release')
check(m.transition('heartbeat',{**expired,'owner':'run-a','fence':1,'lease':b})['decision']=='ownership_lost','old fence cannot renew')
check(m.transition('heartbeat',{**owned,'now':'2026-10-26T01:16:00Z'})['decision']=='ownership_lost','expired owner cannot resurrect')
check(m.transition('claim',{**expired,'now':'2026-10-26T01:15:00Z'})['lease']['fence']==2,'expiry boundary permits exactly one next fence')
reject(lambda:m.inspect({**q,'lease':{**a,'status':'unknown'}}),'unknown lease status rejected')
reject(lambda:m.inspect({**q,'lease':{**a,'fence':True}}),'boolean is not a fence')
check(m.transition('inspect',{**q,'runMode':'scheduled'})['decision']=='needs_schedule_scope','no invented schedule')
window={'start':'2026-10-26T08:00:00+08:00','end':'2026-10-26T10:00:00+08:00'}
check(m.transition('claim',{**q,'runMode':'scheduled','authorizedWindow':window,'now':'2026-10-26T02:00:00Z'})['decision']=='outside_window','schedule cutoff exact')
check(m.transition('claim',{**q,'runMode':'manual','authorizedWindow':window,'now':'2026-10-26T03:00:00Z'})['decision']=='claim_proposed','current manual authorisation distinct from old schedule')
check(m.inspect({**q,'state':{'stopRequested':True}})['decision']=='finished','user stop honoured')
reject(lambda:m.inspect({**q,'branch':'main'}),'no wrong branch')
reject(lambda:m.inspect({**q,'head':'fake'}),'no fake remote head')
reject(lambda:m.inspect({**q,'now':'2026-10-26T01:00:00'}),'no timezone ambiguity')
reject(lambda:m.inspect({**q,'lease':{**a,'expiresAt':'2026-10-26T05:00:00Z'}}),'no unbounded lease')

def git(root,*args,ok=True):
 p=subprocess.run(['git','-C',str(root),*args],text=True,capture_output=True)
 if ok:assert p.returncode==0,p.stderr
 return p

def save(root,files,message):
 for path,value in files.items():
  p=root/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(value if isinstance(value,str) else json.dumps(value))
 git(root,'add','--',*files);git(root,'commit','-m',message);return git(root,'rev-parse','HEAD').stdout.strip()

def read(root,name):return json.loads((root/name).read_text())
with tempfile.TemporaryDirectory(prefix='qy-plugin-recovery-') as temp:
 t=Path(temp);remote=t/'remote.git';git(t,'init','--bare',str(remote));seed=t/'seed';git(t,'clone',str(remote),str(seed))
 for root in [seed]:git(root,'config','user.name','Recovery fixture');git(root,'config','user.email','fixture@example.invalid')
 save(seed,{'app.txt':'baseline','docs/EXECUTION_STATE.json':q['state']},'seed');git(seed,'push','origin','HEAD:refs/heads/feature/cloud-framing-response')
 git(remote,'symbolic-ref','HEAD','refs/heads/feature/cloud-framing-response')
 A=t/'a';git(t,'clone',str(remote),str(A));git(A,'config','user.name','A');git(A,'config','user.email','a@example.invalid')
 base=git(A,'rev-parse','HEAD').stdout.strip();claim=m.transition('claim',{**q,'head':base})['lease']
 save(A,{'docs/CONTINUATION_LEASE.json':claim},'claim');git(A,'push','origin','HEAD:refs/heads/feature/cloud-framing-response')
 base=git(A,'rev-parse','HEAD').stdout.strip();(A/'app.txt').write_text('saved coherent source change')
 test=subprocess.run(['python3','-c','assert 2+2==4'],capture_output=True)
 receipt=m.snapshot(A,{**q,'head':base,'fence':1,'paths':['app.txt'],'stage':'S2','next':'implement next independent item','tests':[{'command':'fixture assertion','status':'passed','exitCode':test.returncode}]})
 cp=m.transition('checkpoint',{**q,'head':base,'lease':claim,'fence':1,'receipt':receipt})
 save(A,{'app.txt':'saved coherent source change','docs/CONTINUATION_LEASE.json':cp['lease'],'docs/continuation/checkpoints/fixture.json':receipt},'checkpoint');git(A,'push','origin','HEAD:refs/heads/feature/cloud-framing-response')
 checkpoint_head=git(A,'rev-parse','HEAD').stdout.strip()
 # A process exits after an unsaved edit. Simulate complete scratch loss after that exit.
 crash=subprocess.run(['python3','-c',"from pathlib import Path;import os;Path('app.txt').write_text('UNSAVED');os._exit(9)"],cwd=A)
 check(crash.returncode==9,'abrupt worker exit observed');shutil.rmtree(A)
 B=t/'b';C=t/'c'
 for root in [B,C]:
  git(t,'clone',str(remote),str(root));git(root,'config','user.name',root.name);git(root,'config','user.email',root.name+'@example.invalid')
 check((B/'app.txt').read_text()=='saved coherent source change','restored committed source after scratch loss')
 check(git(B,'rev-parse','HEAD').stdout.strip()==checkpoint_head,'resumed actual remote checkpoint')
 restored=read(B,'docs/continuation/checkpoints/fixture.json');check(m.verify_receipt(restored),'receipt survived clone')
 check(m.snapshot(B,{**q,'head':base,'fence':1,'paths':['app.txt'],'stage':'S2','next':'next'})['sourceDigest']==restored['sourceDigest'],'source bytes match checkpoint')
 for root in [B,C]:
  s={**expired,'head':checkpoint_head,'lease':read(root,'docs/CONTINUATION_LEASE.json'),'owner':root.name}
  proposed=m.transition('claim',s)['lease'];save(root,{'docs/CONTINUATION_LEASE.json':proposed},'takeover')
 git(B,'push','origin','HEAD:refs/heads/feature/cloud-framing-response')
 check(git(C,'push','origin','HEAD:refs/heads/feature/cloud-framing-response',ok=False).returncode!=0,'concurrent stale Git CAS rejected')
 current=read(B,'docs/CONTINUATION_LEASE.json');check(current['fence']==2,'takeover fence increased')
 check(m.transition('release',{**expired,'lease':current,'owner':'run-a','fence':1})['decision']=='ownership_lost','old owner cannot release replacement')
 for name in ['../escape','/tmp/escape','release.keystore','signing.properties','.env']:
  reject(lambda name=name:m.snapshot(B,{**q,'fence':1,'paths':[name],'stage':'S2','next':'next'}),'exclude private/escaping path')
 reject(lambda:m.verify_receipt({**receipt,'sourceDigest':'0'*64}),'bad evidence hash rejected')
 reject(lambda:m.transition('checkpoint',{**owned,'head':'b'*40,'receipt':receipt}),'checkpoint replay to another HEAD rejected')
 release=m.transition('release',{**expired,'owner':'b','fence':2,'lease':current})['lease']
 check(m.inspect({**expired,'lease':release})['decision']=='resumable','released lease allows next work')
result={'checks':checks,'abruptExitRecovery':True,'scratchLossRecovery':True,'staleWriterRejected':True,'actualGitConcurrentPushRejected':True,'scheduleWindowHonoured':True,'credentialPathsRejected':True,'liveSchedulerWakeTested':False,'phoneTested':False}
(ROOT/'validation/plugin-continuation-0.1.0.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

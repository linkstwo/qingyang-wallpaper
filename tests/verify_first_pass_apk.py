"""Verify the actual cloud APK against locally regenerated candidate inputs."""
import sys,zipfile,json,hashlib,struct
from pathlib import Path
R=Path(__file__).resolve().parents[1]
apk=Path(sys.argv[1])
def manifest(data):
    strings=[];tags=[];pos=8
    def length(p,utf8):
        if utf8:
            a=data[p];return (((a&127)<<8)|data[p+1],p+2) if a&128 else (a,p+1)
        a=struct.unpack_from('<H',data,p)[0];return (((a&32767)<<16)|struct.unpack_from('<H',data,p+2)[0],p+4) if a&32768 else (a,p+2)
    while pos<len(data):
        kind,header,size=struct.unpack_from('<HHI',data,pos)
        if kind==1:
            count,styles,flags,start,_=struct.unpack_from('<IIIII',data,pos+8)
            for i in range(count):
                p=pos+start+struct.unpack_from('<I',data,pos+header+i*4)[0]
                n,p=length(p,bool(flags&256))
                if flags&256:n,p=length(p,True);strings.append(data[p:p+n].decode('utf8'))
                else:strings.append(data[p:p+n*2].decode('utf-16le'))
        elif kind==0x102:
            ns,name,offset,width,count=struct.unpack_from('<IIHHH',data,pos+16);attrs={}
            for i in range(count):
                p=pos+16+offset+i*width;_,key,raw=struct.unpack_from('<III',data,p);typ=data[p+15];value=struct.unpack_from('<I',data,p+16)[0]
                attrs[strings[key]]=strings[raw] if raw!=0xffffffff else strings[value] if typ==3 else value
            tags.append((strings[name],attrs))
        assert size>=8;pos+=size
    return tags
with zipfile.ZipFile(apk) as z:
    assert z.testzip() is None
    tags=manifest(z.read('AndroidManifest.xml'));root=next(a for n,a in tags if n=='manifest');app=next(a for n,a in tags if n=='application')
    assert root['package']=='com.tangtang.motionwallpaper' and root['versionCode']==19 and root['versionName']=='0.6.0',root
    assert not app.get('debuggable',0)
    local=R/'android-app/app/src/main/assets';checked=[]
    for p in local.iterdir():
        if p.is_file():assert z.read('assets/'+p.name)==p.read_bytes(),p.name;checked.append(p.name)
    dex=z.read('classes.dex')
    for symbol in [b'FirstPassAssets',b'side_back_mesh.bin',b'round_character_mesh.bin',b'firstPass',b'GlAssets']:assert symbol in dex,symbol
    assert not any(n.startswith('META-INF/') and n.endswith(('.RSA','.DSA','.EC')) for n in z.namelist())
    assert b'APK Sig Block 42' not in apk.read_bytes(),'Expected unsigned cloud artifact'
    result={'sourceCommit':'ea79388acf8789fc83e8cc113724d0fbf213511c','workflowRun':40448885010,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'bytes':apk.stat().st_size,'package':root['package'],'versionName':root['versionName'],'versionCode':root['versionCode'],'debuggable':False,'crcVerified':True,'packagedAssetsByteCompared':len(checked),'firstPassNativeClassesPresent':True,'signed':False,'installableDelivered':False,'phoneTested':False}
    (R/'validation/first-pass-apk.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

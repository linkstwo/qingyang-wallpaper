"""Exercise the signing helper using a disposable key only; never exports a user APK.
Run: python3 tests/check_signing_helper.py --apk UNSIGNED.apk --sdk SDK_DIR
"""
from pathlib import Path
import argparse, hashlib, json, os, secrets, shutil, subprocess, tempfile
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--apk',required=True,type=Path);p.add_argument('--sdk',required=True,type=Path);args=p.parse_args()
java=Path(shutil.which('java')).resolve();keytool=java.parent/('keytool.exe' if os.name=='nt' else 'keytool')
helper=ROOT/'android-app/tools/SignExisting.java';manifest=(ROOT/'validation/build-0.5.5.properties').read_text()
def command(parts,env=None):return subprocess.run(list(map(str,parts)),env=env,text=True,capture_output=True)
with tempfile.TemporaryDirectory(prefix='qingyang-test-only-sign-') as directory:
 temp=Path(directory);project=temp/'project';project.mkdir();password=secrets.token_urlsafe(24)
 env=dict(os.environ,QY_TEST_PASS=password)
 key=project/'disposable-test-only.p12'
 result=command([keytool,'-genkeypair','-alias','test-only','-keystore',key,'-storetype','PKCS12','-storepass:env','QY_TEST_PASS','-keypass:env','QY_TEST_PASS','-keyalg','RSA','-keysize','2048','-validity','1','-dname','CN=Disposable TEST ONLY'],env)
 assert result.returncode==0,'temporary key creation failed'
 signing=project/'signing.properties';signing.write_text(f'storeFile={key.name}\nstorePassword={password}\nkeyAlias=test-only\nkeyPassword={password}\n');signing.chmod(0o600)
 (project/'local.properties').write_text('sdk.dir='+str(args.sdk.resolve()).replace('\\','\\\\')+'\n')
 props=temp/'build.properties';props.write_text(manifest)
 target=temp/'TEST-ONLY.apk'
 invoke=lambda:command([java,helper,args.apk.resolve(),project,props,target])
 wrong_hash=manifest.replace(next(line for line in manifest.splitlines() if line.startswith('unsignedSha256=')),'unsignedSha256='+'0'*64)
 props.write_text(wrong_hash);bad=invoke()
 assert bad.returncode!=0 and not target.exists() and 'recorded cloud build' in bad.stderr,'input mismatch must be rejected'
 props.write_text(manifest);wrong_cert=invoke()
 assert wrong_cert.returncode!=0 and not target.exists() and 'Certificate differs' in wrong_cert.stderr,'test certificate must not be exported as the production release'
 assert not list(temp.glob('.qingyang-*.apk')),'failed sign must clean up newly created staging files'
 cert=temp/'test-only.der'
 result=command([keytool,'-exportcert','-alias','test-only','-keystore',key,'-storepass:env','QY_TEST_PASS','-file',cert],env)
 assert result.returncode==0
 fingerprint=hashlib.sha256(cert.read_bytes()).hexdigest()
 expected=next(line for line in manifest.splitlines() if line.startswith('releaseCertificateSha256='))
 # Private fixture only: the deliverable manifest keeps the ORIGINAL release certificate.
 props.write_text(manifest.replace(expected,'releaseCertificateSha256='+fingerprint))
 accepted=invoke();assert accepted.returncode==0 and target.exists(),'fixture sign and verify must succeed'
 old=hashlib.sha256(target.read_bytes()).hexdigest();overwrite=invoke()
 assert overwrite.returncode!=0 and hashlib.sha256(target.read_bytes()).hexdigest()==old,'existing output must not be overwritten'
 for result in [bad,wrong_cert,accepted,overwrite]:assert password not in result.stdout+result.stderr,'password must not appear in logs'
metrics={'checks':['reject altered APK','reject wrong release certificate','clean failed staging files','align/sign/verify disposable fixture','preserve existing output','no password in output'],'passed':True,'productionKeyUsed':False,'disposableTestKeyOnly':True,'signedUserApkProduced':False}
(ROOT/'validation/signing-helper.json').write_text(json.dumps(metrics,indent=2)+'\n');print(json.dumps(metrics))

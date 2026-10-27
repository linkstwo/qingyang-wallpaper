"""Check the actual staged Git tree for omitted inputs or accidental local secrets."""
from pathlib import Path
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
def git(*args):
    return subprocess.check_output(['git', '-C', str(ROOT), *args])
paths = git('ls-files', '-z').decode('utf-8').rstrip('\0').split('\0')
assert paths and all(paths)
required = ['README.md', 'AGENTS.md', 'docs/CLOUD_TASK.md', 'docs/BLACK_SCREEN.md',
            'references/asset-manifest.json', 'android-app/gradlew',
            'android-app/gradle/wrapper/gradle-wrapper.jar', 'evidence/baseline/qingyang-0.5.0.apk']
assert all(path in paths for path in required), 'Handoff input missing from Git index'
secret_values = []
local_signing = ROOT / 'android-app/signing.properties'
if local_signing.exists():
    for line in local_signing.read_text(encoding='utf-8-sig').splitlines():
        if '=' in line and line.split('=', 1)[0].strip() in {'keyPassword', 'storePassword'}:
            secret_values.append(line.split('=', 1)[1].strip().encode())
private_key_header = b'-----BEGIN ' + b'PRIVATE KEY-----'
for name in paths:
    parts = Path(name).parts
    assert not any(part in {'.gradle', 'node_modules', 'signing', 'android-recovered', 'recovery'} for part in parts), name
    assert Path(name).suffix.lower() not in {'.keystore', '.jks', '.p12', '.pem', '.key'}, name
    assert Path(name).name not in {'signing.properties', 'local.properties'}, name
    data = git('show', ':' + name)
    assert len(data) < 90 * 1024 * 1024, f'Too large for normal Git: {name}'
    assert private_key_header not in data, f'Private key: {name}'
    assert not any(value and len(value) >= 8 and value in data for value in secret_values), f'Local signing secret: {name}'
# The original manifest describes pre-fix Java, not a requirement to undo current fixes.
# Verify that frozen manifest and its source commit, while allowing authorised application changes.
manifest = 'evidence/baseline/source-files.json'
base = git('log', '--diff-filter=A', '--format=%H', '--', manifest).decode().splitlines()[-1]
original_manifest = git('show', base + ':' + manifest)
assert git('show', ':' + manifest) == original_manifest, 'Frozen source manifest changed'
for record in json.loads(original_manifest)['files']:
    if record['path'].endswith('.java'):
        assert hashlib.sha256(git('show', base + ':' + record['path'])).hexdigest() == record['sha256'], record['path']
mode = git('ls-files', '-s', 'android-app/gradlew').decode().split()[0]
assert mode == '100755', 'gradlew must be executable on Linux'
print(json.dumps({'trackedFiles': len(paths), 'requiredInputsPresent': True,
                  'privateSigningMaterialExcluded': True, 'baselineSourceProvenanceVerified': True, 'applicationJavaMayDiffer': True,
                  'linuxWrapperExecutable': True, 'phoneVerified': False}))

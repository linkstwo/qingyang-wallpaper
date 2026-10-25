"""Verify portable handoff assets without changing any file. Python 3.12 stdlib."""
from pathlib import Path
import hashlib
import json
import struct

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'references/asset-manifest.json').read_text(encoding='utf-8'))
for item in manifest['files']:
    path = ROOT / item['path']
    data = path.read_bytes()
    assert len(data) == item['bytes'], f"Size mismatch: {item['path']}"
    assert hashlib.sha256(data).hexdigest() == item['sha256'], f"Hash mismatch: {item['path']}"
    if 'dimensions' in item:
        if data[:8] == b'\x89PNG\r\n\x1a\n':
            dimensions=list(struct.unpack('>II',data[16:24]))
        elif data[:2] == b'\xff\xd8':
            # The uploaded photo has a .png name but genuine JPEG bytes; preserve it exactly.
            pos=2;dimensions=None
            while pos<len(data):
                if data[pos]!=255:pos+=1;continue
                while pos<len(data) and data[pos]==255:pos+=1
                marker=data[pos];pos+=1
                if marker in (216,217) or 208<=marker<=215:continue
                length=int.from_bytes(data[pos:pos+2],'big')
                if marker in (192,193,194,195,197,198,199,201,202,203,205,206,207):
                    dimensions=[int.from_bytes(data[pos+5:pos+7],'big'),int.from_bytes(data[pos+3:pos+5],'big')];break
                pos+=length
            assert dimensions is not None, str(path)
        else:raise AssertionError('Unsupported image header: '+str(path))
        assert dimensions == item['dimensions'], str(path)
for pair in manifest['identicalCopies']:
    a, b = (ROOT / part for part in pair)
    assert a.read_bytes() == b.read_bytes(), f'Copies diverged: {pair}'
apk = ROOT / 'evidence/baseline/qingyang-0.5.0.apk'
assert hashlib.sha256(apk.read_bytes()).hexdigest() == 'c8a61b9894269651e778e11aa7558fb411648071d896202a994835defa859db7'
print(json.dumps({'filesVerified': len(manifest['files']), 'identicalCopyPairs': len(manifest['identicalCopies']),
                  'baselineApkVerified': True, 'phoneValidation': False}, ensure_ascii=False))

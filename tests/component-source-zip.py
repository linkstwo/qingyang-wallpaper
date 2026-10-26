"""Archive audit works in memory and rejects ambiguous duplicate originals."""
import argparse
import json
from pathlib import Path
import sys
import tempfile
import warnings
import zipfile
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from verify_component_sources import audit
parser = argparse.ArgumentParser()
parser.add_argument('archive', type=Path)
args = parser.parse_args()
assert audit(archive=args.archive)['status'] == 'verified'
with zipfile.ZipFile(args.archive) as bundle:
    name = '工业车间里的蓝图时光.png'
    raw = bundle.read(name)
with tempfile.TemporaryDirectory() as temp:
    root = Path(temp)
    candidate = root / 'candidate.zip'
    with warnings.catch_warnings():
        warnings.simplefilter('ignore', UserWarning)
        with zipfile.ZipFile(candidate, 'w') as bundle:
            bundle.writestr(name, raw)
            bundle.writestr(name, raw)
    result = audit(archive=candidate)
    assert result['status'] == 'failed' and any('duplicate ZIP' in e for e in result['errors'])
    with zipfile.ZipFile(candidate, 'w') as bundle:
        bundle.writestr(name, raw[:-10])
    result = audit(archive=candidate)
    assert result['status'] == 'failed' and any('unexpected decompressed size' in e for e in result['errors'])
    with zipfile.ZipFile(candidate, 'w') as bundle:
        bundle.writestr(name, bytes([raw[0]^1])+raw[1:])
    result = audit(archive=candidate)
    assert result['status'] == 'failed' and any('byte identity mismatch' in e for e in result['errors'])
    with zipfile.ZipFile(candidate, 'w') as bundle:
        bundle.writestr(name, raw)
        bundle.writestr('../escaped.png', b'never extract')
    result = audit(archive=candidate)
    assert result['status'] == 'incomplete' and len(result['missingOriginals']) == 9
    assert all(c['sourcePixelsVerified'] for c in result['crops'])
    assert list(root.iterdir()) == [candidate]
print(json.dumps(dict(status='passed', checks=5, archiveExtracted=False,
    duplicateMembersRejected=True, incompleteNeverAccepted=True)))

"""Guard against wrong donor overwrites, including Python optimisation mode."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from prepare_shoulder_components import ROOT, prepare
parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
args = parser.parse_args()
def hashes(root):
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in (root / 'references/derived').glob('*') if p.is_file()}
before = hashes(ROOT)
assert prepare(args.source, check=True)['sourcePixelsExact']
assert hashes(ROOT) == before
with tempfile.TemporaryDirectory() as temp:
    root = Path(temp)
    shutil.copytree(ROOT / 'references/derived', root / 'references/derived')
    generated = prepare(args.source, root=root)
    assert generated['components'] == json.loads((ROOT / 'references/derived/side-b-component-manifest.json').read_text())['components']
    assert hashes(root) == before, 'reproduction altered exact asset or manifest bytes'
    record = generated['components'][0]
    path = root / record['path']
    path.write_bytes(b'broken PNG')
    corrupted = hashes(root)
    try:
        prepare(args.source, check=True, root=root)
        raise AssertionError('corrupted output accepted')
    except ValueError as error:
        assert 'hash mismatch' in str(error)
    assert hashes(root) == corrupted, 'check mode repaired/overwrote failure'
    for mode in [[], ['-O']]:
        run = subprocess.run([sys.executable, *mode, str(ROOT / 'scripts/prepare_shoulder_components.py'),
                              str(ROOT / 'references/originals/main-reading-v2.png')], capture_output=True, text=True)
        assert run.returncode != 0 and 'Wrong donor source' in run.stderr
        assert hashes(ROOT) == before
print(json.dumps(dict(status='passed', checks=6, originalBytesUnchanged=True,
    decodedPixelCheck=True, reproductionByteExact=True, optimizedPythonRejectsWrongDonor=True)))

"""Mutation negatives for T01: changing hashes alone must not legitimise wrong pixels."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import sys
import tempfile
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from verify_component_sources import ROOT, audit

parser = argparse.ArgumentParser()
parser.add_argument('--archive', type=Path, required=True)
args = parser.parse_args()
assert audit(archive=args.archive)['status'] == 'verified'
count = 1
with tempfile.TemporaryDirectory() as temp:
    root = Path(temp)
    shutil.copytree(ROOT / 'references', root / 'references')
    manifest_path = root / 'references/derived/side-b-component-manifest.json'
    original = manifest_path.read_text()
    def mutation(name, change):
        global count
        manifest = json.loads(original)
        change(manifest)
        manifest_path.write_text(json.dumps(manifest))
        result = audit(root, args.archive)
        assert result['status'] == 'failed', (name, result)
        print(name + ': rejected')
        count += 1
        manifest_path.write_text(original)
    mutation('invented new angle', lambda m: m.update(newCameraAnglesClaimed=2))
    mutation('component count as view count', lambda m: m.update(independentSourceViews=2))
    mutation('negative crop bounds', lambda m: m['components'][0].update(cropRect=[-1,300,249,500]))
    mutation('fractional crop bounds', lambda m: m['components'][0].update(cropRect=[650.5,300,900,500]))
    mutation('source hash swapped', lambda m: m['components'][0].update(sourceSha256='0'*64))
    mutation('unvalidated acceptance', lambda m: m['components'][0].update(registrationAccepted=True, confidence=1))
    mutation('changed output hash', lambda m: m['components'][0].update(outputSha256='0'*64))
    mutation('mirrored declaration', lambda m: m['components'][0].update(mirrored=True))
    manifest = json.loads(original)
    crop = manifest['components'][0]
    path = root / crop['path']
    with Image.open(path) as im:
        changed = im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        changed.save(path)
    crop['outputSha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
    manifest_path.write_text(json.dumps(manifest))
    result = audit(root, args.archive)
    assert any('RGB differs' in e for e in result['errors']), result
    count += 1
    print('mirrored pixels with recomputed valid hash: rejected')
    shutil.copy2(ROOT / crop['path'], path)
    manifest_path.write_text(original)
    equivalent = root / 'references/originals/side-reference.png'
    with Image.open(equivalent) as im:
        changed = im.convert('RGB')
        pixel = changed.getpixel((10, 10))
        changed.putpixel((10, 10), (pixel[0]^1, pixel[1], pixel[2]))
        changed.save(equivalent)
    result = audit(root, args.archive)
    assert any('declared pixel equivalent differs' in e for e in result['errors'])
    count += 1
    print('one-pixel corruption of Git equivalent: rejected')
    shutil.copy2(ROOT / 'references/originals/side-reference.png', equivalent)
    partial = audit(root)
    assert partial['status'] == 'incomplete' and len(partial['missingOriginals']) == 10
    assert not any(c['sourcePixelsVerified'] for c in partial['crops'])
    count += 1
    print('missing archive: incomplete, never verified')
print(json.dumps(dict(checks=count, status='passed', anatomicalCorrespondenceAccepted=False)))

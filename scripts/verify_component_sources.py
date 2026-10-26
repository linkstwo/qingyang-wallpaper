"""Read-only T01 provenance gate. Byte identity is not anatomical acceptance."""
from pathlib import Path
import argparse
import hashlib
import json
import io
import zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inside(root, name):
    path = (root / name).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError('path escapes source root')
    return path


def audit(root=ROOT, archive=None):
    root = Path(root)
    inventory = json.loads((root / 'references/multiview-archive-manifest.json').read_text())
    review = json.loads((root / 'references/component-source-review-20261027.json').read_text())
    errors, missing, verified, images = [], [], [], {}
    # Read expected members in memory: no archive extraction or path writes.
    archive_bytes = {}
    if archive is not None and Path(archive).is_file():
        with zipfile.ZipFile(archive) as bundle:
            for item in inventory['files']:
                matches = [i for i in bundle.infolist() if i.filename == item['name']]
                if not matches:
                    continue
                if len(matches) != 1 or matches[0].file_size != item['bytes']:
                    errors.append(item['name'] + ': duplicate ZIP entry or unexpected decompressed size')
                    continue
                archive_bytes[item['name']] = bundle.read(matches[0])
    rows = {r['source']: r for r in review['rows']}
    if len(rows) != len(review['rows']):
        errors.append('duplicate review source')
    names = [r['name'] for r in inventory['files']]
    if len(set(names)) != len(names) or set(rows) != set(names):
        errors.append('inventory/review source sets differ or contain duplicates')
    for item in inventory['files']:
        name, digest = item['name'], item['sha256']
        row = rows.get(name, {})
        if row.get('sourceSha256') != digest or row.get('size') != item['size']:
            errors.append(f'{name}: review identity/size mismatch')
        if row.get('acceptedCrossViewCorrespondence') is not False or row.get('angularCalibration') is not None:
            errors.append(f'{name}: unvalidated correspondence or angular calibration claim')
        # Re-encoded pixel-equivalent Git files are not byte-identical archive originals.
        if archive is None:
            missing.append(name)
            continue
        if Path(archive).is_file():
            raw = archive_bytes.get(name)
        else:
            path = inside(Path(archive), name)
            raw = path.read_bytes() if path.is_file() else None
        if raw is None:
            missing.append(name)
            continue
        if hashlib.sha256(raw).hexdigest() != digest or len(raw) != item['bytes']:
            errors.append(f'{name}: original byte identity mismatch')
            continue
        with Image.open(io.BytesIO(raw)) as im:
            if list(im.size) != item['size']:
                errors.append(f'{name}: original dimensions mismatch')
                continue
            images[name] = im.convert('RGB').copy()
        verified.append(name)
    equivalents = []
    for item in inventory['files']:
        for name in item.get('exactPixelEquivalentPaths', []):
            path = inside(root, name)
            result = dict(path=name, source=item['name'], sourcePixelsVerified=False)
            equivalents.append(result)
            if not path.is_file():
                errors.append(name + ': declared pixel equivalent missing')
                continue
            result['gitSha256'] = sha(path)
            result['bytesEqualToArchive'] = result['gitSha256'] == item['sha256']
            with Image.open(path) as im:
                donor = images.get(item['name'])
                if donor is not None:
                    result['sourcePixelsVerified'] = im.size == donor.size and im.convert('RGB').tobytes() == donor.tobytes()
                    if not result['sourcePixelsVerified']:
                        errors.append(name + ': declared pixel equivalent differs from original')
    manifest = json.loads((root / 'references/derived/side-b-component-manifest.json').read_text())
    broad = json.loads((root / 'references/derived/side-b-shoulder-back.json').read_text())
    crops = manifest['components'] + [dict(id='side-b-shoulder-back', path=broad['output'],
        sourceFile=broad['sourceFile'], sourceSha256=broad['sourceSha256'], cropRect=broad['cropRect'],
        size=broad['outputSize'], outputSha256=broad['outputSha256'], rgbExact=broad['rgbExact'],
        mirrored=broad['mirrored'], resampled=broad['resampled'], confidence=broad['confidence'],
        registrationAccepted=broad['continuousViewAccepted'])]
    if manifest['newCameraAnglesClaimed'] != 0 or manifest['independentSourceViews'] != len({c['sourceSha256'] for c in manifest['components']}):
        errors.append('crop count is being confused with source-view count')
    if len({c['id'] for c in crops}) != len(crops):
        errors.append('duplicate component id')
    results = []
    for crop in crops:
        label = crop['id']
        result = dict(id=label, outputBytesVerified=False, sourcePixelsVerified=False)
        results.append(result)
        source_row = rows.get(crop['sourceFile'])
        if not source_row or source_row['sourceSha256'] != crop['sourceSha256']:
            errors.append(f'{label}: unknown or mismatched donor')
        box = crop['cropRect']
        if len(box) != 4 or any(type(x) is not int for x in box):
            errors.append(f'{label}: crop must have four integer bounds')
            continue
        x0, y0, x1, y1 = box
        size = source_row['size'] if source_row else [0, 0]
        if not (0 <= x0 < x1 <= size[0] and 0 <= y0 < y1 <= size[1]):
            errors.append(f'{label}: crop bounds outside donor')
            continue
        if crop['size'] != [x1-x0, y1-y0]:
            errors.append(f'{label}: declared crop size mismatch')
        if any(crop[k] is not False for k in ['resampled', 'mirrored', 'registrationAccepted']) or crop['rgbExact'] is not True or crop['confidence'] != 0:
            errors.append(f'{label}: invalid lossless/acceptance claim')
        path = inside(root, crop['path'])
        if not path.is_file() or sha(path) != crop['outputSha256']:
            errors.append(f'{label}: output byte identity mismatch')
            continue
        with Image.open(path) as im:
            actual = im.convert('RGB')
            if list(im.size) != crop['size']:
                errors.append(f'{label}: output dimensions mismatch')
                continue
            result['outputBytesVerified'] = True
            donor = images.get(crop['sourceFile'])
            if donor is not None:
                result['sourcePixelsVerified'] = actual.tobytes() == donor.crop(box).tobytes()
                if not result['sourcePixelsVerified']:
                    errors.append(f'{label}: RGB differs from declared original crop')
    complete = not errors and not missing and all(c['sourcePixelsVerified'] for c in results)
    return dict(status='failed' if errors else 'verified' if complete else 'incomplete',
        verifiedOriginals=verified, missingOriginals=missing, crops=results, pixelEquivalents=equivalents, errors=errors,
        anatomicalCorrespondenceAccepted=False, continuousViewAccepted=False,
        newCameraAnglesClaimed=0)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, help='Directory or ZIP containing the ten exact archive originals')
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    result = audit(archive=args.archive)
    text = json.dumps(result, ensure_ascii=False, indent=2)+'\n'
    if args.output:
        args.output.write_text(text)
    print(text, end='')
    return {'verified': 0, 'failed': 1, 'incomplete': 2}[result['status']]


if __name__ == '__main__':
    raise SystemExit(main())

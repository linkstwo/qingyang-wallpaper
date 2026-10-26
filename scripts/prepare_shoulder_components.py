"""Reproduce lossless donor patches, or check them without writing any asset."""
from pathlib import Path
from PIL import Image
import argparse
import hashlib
import io
import json

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = '23a8985745ee4fb33a22f6a210eb6cc0f8a3c52224fcb7c577ff66b601063b16'
SOURCE_NAME = '工业车间里的蓝图时光.png'
PATCHES = [
    ('side-b-nape-shoulder', (650, 300, 900, 500),
     'nape/strap local authoring; contains background and hair, no accepted cross-view registration'),
    ('side-b-upper-arm', (790, 410, 945, 640),
     'bent-arm upper shoulder cap; pose differs, never transfer as the supported arm'),
]


def prepare(source, check=False, root=ROOT):
    source, root = Path(source), Path(root)
    raw = source.read_bytes()
    if hashlib.sha256(raw).hexdigest() != EXPECTED:
        raise ValueError('Wrong donor source; refusing crop')
    with Image.open(io.BytesIO(raw)) as im:
        if im.size != (1086, 1448):
            raise ValueError('Wrong donor dimensions')
        image = im.convert('RGB')
    manifest_path = root / 'references/derived/side-b-component-manifest.json'
    existing = json.loads(manifest_path.read_text()) if check else None
    rows, pending = [], []
    for name, box, use in PATCHES:
        crop = image.crop(box)
        path = root / 'references/derived' / (name + '.png')
        if check:
            record = next((c for c in existing['components'] if c['id'] == name), None)
            if record is None or record['cropRect'] != list(box) or record['sourceSha256'] != EXPECTED:
                raise ValueError(name + ': donor identity or crop bounds mismatch')
            data = path.read_bytes()
            if hashlib.sha256(data).hexdigest() != record['outputSha256']:
                raise ValueError(name + ': output hash mismatch')
            # Verify decoded pixels, rather than encoder-dependent regenerated PNG bytes.
            with Image.open(io.BytesIO(data)) as actual:
                if actual.size != crop.size or actual.convert('RGB').tobytes() != crop.tobytes():
                    raise ValueError(name + ': crop pixels differ from original')
        else:
            stream = io.BytesIO()
            crop.save(stream, format='PNG')
            data = stream.getvalue()
            pending.append((path, data))
        rows.append(dict(id=name, path=str(path.relative_to(root)), sourceFile=SOURCE_NAME,
            sourceSha256=EXPECTED, cropRect=list(box), size=list(crop.size),
            outputSha256=hashlib.sha256(data).hexdigest(), rgbExact=True, resampled=False,
            mirrored=False, confidence=0, registrationAccepted=False, use=use))
    if check:
        return dict(status='verified', mode='read_only', components=len(rows),
                    sourceSha256=EXPECTED, sourcePixelsExact=True, registrationAccepted=False)
    result = dict(version=1, independentSourceViews=1, newCameraAnglesClaimed=0,
        components=rows, reason='Neck/strap/outer-shoulder candidate triangle reverses orientation; split authoring patches before trying local corrections.')
    # Decode and validate everything before replacing the first output.
    for path, data in pending:
        path.write_bytes(data)
    manifest_path.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--check', action='store_true', help='Verify existing crops without rewriting files')
    args = parser.parse_args()
    print(json.dumps(prepare(args.source, args.check), ensure_ascii=False))


if __name__ == '__main__':
    main()

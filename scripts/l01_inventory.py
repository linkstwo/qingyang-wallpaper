import hashlib, json, os, struct

def png_dimensions(fp):
    """Read PNG width/height from IHDR chunk."""
    with open(fp, 'rb') as f:
        header = f.read(24)
    if len(header) < 24 or header[:8] != b'\x89PNG\r\n\x1a\n':
        return None
    w, h = struct.unpack('>II', header[16:24])
    return [w, h]

def jpeg_dimensions(fp):
    """Read JPEG width/height from SOF marker."""
    with open(fp, 'rb') as f:
        data = f.read()
    if data[:3] != b'\xff\xd8\xff':
        return None
    i = 2
    while i < len(data):
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i+1]
        if marker in (0xC0, 0xC1, 0xC2, 0xC3):
            h = struct.unpack('>H', data[i+5:i+7])[0]
            w = struct.unpack('>H', data[i+7:i+9])[0]
            return [w, h]
        length = struct.unpack('>H', data[i+2:i+4])[0]
        i += 2 + length
    return None

def dimensions(fp):
    d = png_dimensions(fp)
    if d:
        return d
    return jpeg_dimensions(fp)

results = []

dirs = [
    'references',
    'references/originals',
    'references/derived',
    'android-app/app/src/main/assets',
    'character-prototype/preview',
]

for d in dirs:
    if not os.path.isdir(d):
        continue
    for f in sorted(os.listdir(d)):
        fp = os.path.join(d, f)
        if not os.path.isfile(fp):
            continue
        rel = fp.replace('\\', '/')
        size = os.path.getsize(fp)
        with open(fp, 'rb') as fh:
            sha = hashlib.sha256(fh.read()).hexdigest()
        entry = {'path': rel, 'bytes': size, 'sha256': sha}
        if f.endswith('.png') or f.endswith('.jpg') or f.endswith('.jpeg'):
            dim = dimensions(fp)
            if dim:
                entry['dimensions'] = dim
                entry['actualFormat'] = 'JPEG' if jpeg_dimensions(fp) and not png_dimensions(fp) else 'PNG'
        results.append(entry)

out = os.path.join(os.path.dirname(__file__), '..', 'validation', 'l01-asset-inventory.json')
with open(out, 'w', encoding='utf-8') as fh:
    json.dump(results, fh, indent=2, ensure_ascii=False)

print(f'Wrote {len(results)} entries to {out}')
for r in results:
    dim = f' {r["dimensions"]}' if 'dimensions' in r else ''
    print(f'  {r["path"]}: {r["bytes"]}{dim}')

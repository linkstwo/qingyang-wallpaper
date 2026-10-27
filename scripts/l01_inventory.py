import hashlib, json, os, struct

def png_dimensions(fp):
    """Read PNG width/height from IHDR chunk without PIL."""
    with open(fp, 'rb') as f:
        header = f.read(24)
    # PNG signature 8 bytes + length 4 bytes + 'IHDR' 4 bytes + width 4 + height 4
    if len(header) < 24 or header[:8] != b'\x89PNG\r\n\x1a\n':
        return None
    w, h = struct.unpack('>II', header[16:24])
    return [w, h]

results = []

dirs = [
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
        if f.endswith('.png'):
            dim = png_dimensions(fp)
            if dim:
                entry['dimensions'] = dim
        results.append(entry)

out = os.path.join(os.path.dirname(__file__), '..', 'validation', 'l01-asset-inventory.json')
with open(out, 'w', encoding='utf-8') as fh:
    json.dump(results, fh, indent=2, ensure_ascii=False)

print(f'Wrote {len(results)} entries to {out}')
for r in results:
    dim = f' {r["dimensions"]}' if 'dimensions' in r else ''
    print(f'  {r["path"]}: {r["bytes"]}{dim}')

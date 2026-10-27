import json, os
from collections import defaultdict

with open(os.path.join(os.path.dirname(__file__), '..', 'validation', 'l01-asset-inventory.json'), encoding='utf-8') as f:
    files = json.load(f)

# Group by sha256 to find duplicates
by_hash = defaultdict(list)
for f in files:
    by_hash[f['sha256']].append(f['path'])

duplicates = {h: paths for h, paths in by_hash.items() if len(paths) > 1}

print("=== DUPLICATE FILES (same sha256) ===")
for h, paths in sorted(duplicates.items(), key=lambda x: -len(x[1])):
    print(f"\nHash: {h[:16]}... ({len(paths)} copies)")
    for p in paths:
        print(f"  {p}")

# Find files in android assets that are not in manifest or have issues
android_assets = [f for f in files if f['path'].startswith('android-app/app/src/main/assets/')]
print(f"\n=== ANDROID ASSETS ({len(android_assets)} files) ===")
for a in android_assets:
    dim = f" {a['dimensions']}" if 'dimensions' in a else ''
    print(f"  {a['path']}: {a['bytes']}{dim}")

# Derived files
derived = [f for f in files if f['path'].startswith('references/derived/')]
print(f"\n=== DERIVED FILES ({len(derived)} files) ===")
for d in derived:
    dim = f" {d['dimensions']}" if 'dimensions' in d else ''
    print(f"  {d['path']}: {d['bytes']}{dim}")

# Check: original.png vs main-reading-v2.png should be identical
orig = [f for f in files if f['path'].endswith('/original.png') or f['path'].endswith('/main-reading-v2.png')]
print(f"\n=== MAIN IMAGE COPIES ===")
for o in orig:
    print(f"  {o['path']}: sha={o['sha256'][:16]}...")

# Summary
pngs = [f for f in files if f['path'].endswith('.png')]
bins = [f for f in files if f['path'].endswith('.bin')]
print(f"\n=== SUMMARY ===")
print(f"Total files: {len(files)}")
print(f"PNG images: {len(pngs)}")
print(f"Binary meshes: {len(bins)}")
print(f"Duplicate groups: {len(duplicates)}")

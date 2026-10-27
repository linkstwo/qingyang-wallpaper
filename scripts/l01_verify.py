import json, hashlib, random

with open('validation/l01-asset-inventory.json') as f:
    inv = json.load(f)

random.seed(42)
samples = random.sample(inv, 8)
print("=== Hash verification (8 random samples) ===")
all_ok = True
for s in samples:
    try:
        with open(s['path'], 'rb') as f:
            actual = hashlib.sha256(f.read()).hexdigest()
        ok = actual == s['sha256']
        if not ok:
            all_ok = False
        mark = "OK" if ok else "MISMATCH"
        print(f"  [{mark}] {s['path']}")
    except Exception as e:
        print(f"  [ERROR] {s['path']}: {e}")

pngs = [f for f in inv if f['path'].endswith('.png')]
print(f"\n=== PNG dimensions check ===")
missing_dim = [p for p in pngs if 'dimensions' not in p]
if missing_dim:
    print(f"  Missing dimensions: {len(missing_dim)}")
    for m in missing_dim:
        print(f"    - {m['path']}")
else:
    print(f"  All {len(pngs)} PNGs have dimensions")

# Check for files on disk not in inventory
import os
disk_files = set()
for root, dirs, files in os.walk('references'):
    for f in files:
        rel = os.path.join(root, f).replace('\\', '/')
        disk_files.add(rel)
inv_files = set(f['path'] for f in inv if f['path'].startswith('references/'))
missing = disk_files - inv_files
extra = inv_files - disk_files
print(f"\n=== Coverage check ===")
print(f"  Files on disk (references/): {len(disk_files)}")
print(f"  Files in inventory: {len(inv_files)}")
if missing:
    print(f"  MISSING from inventory: {missing}")
if extra:
    print(f"  EXTRA in inventory (not on disk): {extra}")
if not missing and not extra:
    print("  All reference files covered, no orphans")

print(f"\n=== Overall: {'PASS' if all_ok else 'FAIL'} ===")

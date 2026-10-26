# T01 exact source and crop integrity gate

Independent audit branch based on 5c3bf05, while main fence12 has a fresh lease. No main geometry, UI, sensors, or production assets changed. AI bridge scoped review request returned HTTP404; no Doubao review is claimed.

Implemented `scripts/verify_component_sources.py`. Against the ten original archive PNGs, checks original byte hashes, lengths, dimensions and review identity, then independently decodes the three donor crops and compares every RGB byte with the declared source rectangles. Checks integer in-bounds rectangles, dimensions, one donor vs multiple components, zero newly calibrated angles, and unaccepted correspondence flags. Git's `exactPixelEquivalentPaths` are deliberately not substituted for byte-identical archive originals: some are resampled versions.

Actual full audit: ten originals and all three lossless crops verified. This proves source provenance only. Neck/arm alignment, continuous shoulders/back and T01 as a whole remain unaccepted. No new APK.

Commands:

```
python3 scripts/verify_component_sources.py --archive /path/to/extracted/archive --output validation/component-source-integrity.json
python3 tests/component-source-integrity.py --archive /path/to/extracted/archive
```

Exit0 verified; exit1 validation failure; exit2 incomplete without original bytes. No archive: the Git crop bytes are checked but source RGB equivalence remains unverified. The archive is already persisted as libfile_87b01f83278c8191a58ee9ac01bf06d4; do not upload a duplicate.

Mutation coverage includes changed donor identity, fractional/out-of-bounds crop, invented angles, components-as-views, unaccepted confidence changes, altered hash, mirror declaration, and actual mirrored pixels with a recomputed valid output SHA. The last case proves a self-consistent manifest hash alone cannot legitimise incorrect source pixels.

Next: extend source provenance to workbench draft imports, which currently save an image URL/hash without binding crop origins, then audit matching import rejection paths. Main worker can selectively cherry-pick implementation/test/report files, excluding this branch's lease. No branch merge into main is authorised.

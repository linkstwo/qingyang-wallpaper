# T01 exact source and crop integrity gate

Independent audit branch based on 5c3bf05, while main fence12 has a fresh lease. No main geometry, UI, sensors, or production assets changed. AI bridge scoped review request returned HTTP404; no Doubao review is claimed.

Implemented `scripts/verify_component_sources.py`. Against the ten original archive PNGs, checks original byte hashes, lengths, dimensions and review identity, then independently decodes the three donor crops and compares every RGB byte with the declared source rectangles. Checks integer in-bounds rectangles, dimensions, one donor vs multiple components, zero newly calibrated angles, and unaccepted correspondence flags. Git's `exactPixelEquivalentPaths` are deliberately not substituted for byte-identical archive originals: all four currently decode to exact RGB pixels, while PNG encodings differ. This is now independently checked as a separate result.

Actual full audit: ten originals and all three lossless crops verified. This proves source provenance only. Neck/arm alignment, continuous shoulders/back and T01 as a whole remain unaccepted. No new APK.

Commands:

```
python3 scripts/verify_component_sources.py --archive /path/to/extracted/archive --output validation/component-source-integrity.json
python3 tests/component-source-integrity.py --archive /path/to/extracted/archive
```

Exit0 verified; exit1 validation failure; exit2 incomplete without original bytes. No archive: the Git crop bytes are checked but source RGB equivalence remains unverified. The archive is already persisted as libfile_87b01f83278c8191a58ee9ac01bf06d4; do not upload a duplicate.

Mutation coverage includes changed donor identity, fractional/out-of-bounds crop, invented angles, components-as-views, unaccepted confidence changes, altered hash, mirror declaration, and actual mirrored pixels with a recomputed valid output SHA. The last case proves a self-consistent manifest hash alone cannot legitimise incorrect source pixels.

Next: extend source provenance to workbench draft imports, which currently save an image URL/hash without binding crop origins, then audit matching import rejection paths. Main worker can selectively cherry-pick implementation/test/report files, excluding this branch's lease. No branch merge into main is authorised.

## Reproducible crop exporter

Added `prepare_shoulder_components.py SOURCE --check`: decodes and compares existing pixels without rewriting source, outputs, or manifest. Normal generation is byte-exact with the committed two components on this environment. Donor hash/dimension rejection uses explicit exceptions rather than `assert`, so `python -O` cannot bypass identity protection and overwrite crops from a different picture. All candidate outputs are prepared in memory before writing. Six reproducibility/negative checks passed including a corrupt output, original-byte preservation and wrong donor rejection both normally and under optimisation.

`python3 tests/shoulder-component-reproducibility.py /path/to/工业车间里的蓝图时光.png`

## ZIP and renamed source recovery

The same `--archive` argument now accepts the persisted original ZIP without extraction. Only ten expected member names and expected decompressed lengths are read; duplicate source entries are rejected instead of silently choosing one. Missing originals remain incomplete. Five ZIP cases passed, including duplicate members, altered content with unchanged length, wrong decompressed length and a traversal-named extra entry that was never extracted. Both directory and ZIP full audits pass.

Generator source identity now follows its verified SHA and canonical archive name, not the local download filename. Renaming exact downloaded bytes still reproduces identical manifest/output bytes. Seven generation checks passed.

Final full integrity mutation run:12 cases passed, including one changed pixel in a declared Git equivalent. ZIP5 and reproducibility7 passed. Source/crop verification does not complete T01 anatomical correspondence.

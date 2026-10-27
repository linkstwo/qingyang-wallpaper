# Shoulder / Nape / Armpit Visible Points — v2 (rework)

STATUS: needs_rework. Previous version used wrong image (main-front-three-quarter.png) and made invalid cross-image claims. This version lists ONLY per-image visible points, no cross-image correspondence claims.

---

## Image 1: main-reading-v2.png
- Path: D:\QingyangRouteReview-20261026\active\references\originals\main-reading-v2.png
- Size: 1152 x 1536
- SHA256: cc43f133c865b272f06cdff0d35086fae5b668100a70df09cc5cc1d0301eb411
- Pose: face looking down toward left side of frame

| Point | Pixel (x,y) | approx error | Visibility |
|---|---|---|---|
| Bun (top of head) | (680, 80) | ±20 | clear |
| Ear (right side of frame) | (650, 240) | ±20 | clear |
| Neck side (right side of frame) | (720, 380) | ±25 | clear, shadowed |
| Shoulder tip (right side of frame) | (850, 420) | ±20 | clear |
| Tank strap (right side of frame) | (800, 450) | ±15 | clear |
| Shoulder tip (left side of frame) | (500, 480) | ±25 | partial, shadow |
| Tank strap (left side of frame) | (520, 520) | ±20 | clear |
| Armpit (right side of frame) | (850, 550) | — | occluded by upper arm |
| Armpit (left side of frame) | (550, 600) | — | occluded by tank top |

---

## Image 2: side-reference.png
- Path: D:\QingyangRouteReview-20261026\active\references\originals\side-reference.png
- Size: 1086 x 1448
- SHA256: a516ad4653775d3295434602371861f7ed1ea822454dedd810cf1dabd0d620d3
- Pose: profile facing right side of frame

| Point | Pixel (x,y) | approx error | Visibility |
|---|---|---|---|
| Bun (top of head) | (300, 80) | ±20 | clear |
| Ear | (500, 220) | ±20 | clear |
| Nape (back of neck) | (350, 350) | ±25 | clear |
| Shoulder tip | (300, 420) | ±20 | clear |
| Tank back strap | (180, 450) | ±15 | clear |
| Armpit | (350, 680) | ±30 | partial, arm overlaps |
| Outer upper arm | (400, 620) | ±20 | clear |

---

## Image 3: back-reference.png
- Path: D:\QingyangRouteReview-20261026\active\references\originals\back-reference.png
- Size: 1086 x 1448
- SHA256: 8bd1d23c05f72f3a48d3585184a635242d5c5a7cbe5070d2b7d9e0f61ce50574
- Pose: back view, slightly from right

| Point | Pixel (x,y) | approx error | Visibility |
|---|---|---|---|
| Bun (back of head) | (450, 80) | ±20 | clear |
| Nape center | (450, 250) | ±20 | clear |
| Shoulder tip (left side of frame) | (250, 420) | ±25 | clear |
| Shoulder tip (right side of frame) | (600, 400) | ±25 | clear |
| Tank strap (left side of frame) | (280, 430) | ±20 | clear |
| Tank strap (right side of frame) | (600, 430) | ±20 | clear |
| Armpit (left side of frame) | (200, 550) | ±30 | partial, arm overlaps |

---

## Notes
- "left/right side of frame" = viewer's left/right, NOT character's left/right
- No cross-image correspondence claimed. Codex does final registration.
- All coordinates are visual estimates, not measured.
- front-variant.png not included — not a shoulder/back reference.

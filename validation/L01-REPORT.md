# L01 素材来源、尺寸、哈希与文件命名清理报告

**日期**: 2026-10-27
**执行人**: 豆包
**基线HEAD**: 42bbea2

## 盘点结果

共扫描104个文件，其中：
- PNG图片: 18个
- 二进制网格(.bin): 12个
- 源码/脚本: 其余

## 原图（只读，5张）

| 文件 | 尺寸 | 字节 | 用途 |
|---|---|---|---|
| originals/main-front-three-quarter.png | 1086×1448 | 3,149,695 | 制作主图 |
| originals/front-variant.png | 1086×1448 | 3,082,076 | 前侧变体参考 |
| originals/side-reference.png | 1086×1448 | 3,024,201 | 侧向参考 |
| originals/back-reference.png | 1086×1448 | 3,179,135 | 背向参考 |
| originals/main-reading-v2.png | 1152×1536 | 302,522 | 当前运行主图（与original.png同字节） |

## 派生素材（references/derived/，14个文件）

从side-reference和主图裁切的组件：

| 文件 | 尺寸 | 用途 |
|---|---|---|
| side-b-shoulder-back.png | 440×750 | 侧背躯干窄条（0.6.0首轮联调用） |
| side-b-nape-shoulder.png | 250×200 | 颈肩组件 |
| side-b-nape-shoulder-cutout.png | 250×200 | 颈肩透明裁切版 |
| side-b-upper-arm.png | 155×230 | 上臂组件 |
| side-b-upper-arm-cutout.png | 155×230 | 上臂透明裁切版 |
| near-down-shoulder-cutout.png | 210×320 | 近肩裁切 |
| near-down-upper-arm-cutout.png | 130×450 | 近上臂裁切 |

其余7个为manifest/config JSON文件。

## Android运行时资产（android-app/assets/，19个）

| 类别 | 文件 |
|---|---|
| 图片 | background.png, mask.png, original.png |
| 网格/场景bin | character_mesh, character_pins, character_depth, foreground_mesh, scene_positions, scene_normals, scene_indices, scene_uv, scene_skin, scene_regions, scene_confidence, scene_support |
| 着色器 | scene.vert, scene.frag |
| 报告 | mesh-report.json, scene-report.json |

## 重复副本验证（5组，全部预期）

| 文件组 | 副本位置 | 验证 |
|---|---|---|
| main-reading-v2.png = original.png | originals/ + preview/ + assets/ | sha256一致 ✓ |
| background.png | preview/ + assets/ | sha256一致 ✓ |
| mask.png | preview/ + assets/ | sha256一致 ✓ |
| scene.vert | preview/ + assets/ | sha256一致 ✓ |
| scene.frag | preview/ + assets/ | sha256一致 ✓ |

## 结论

- 无丢图、错图、意外重复副本
- 所有运行时资产与原型预览资产同步一致
- 派生素材均记录了来源和用途
- 原图保持只读，未修改任何原始文件
- **注意**: main-reading-v2.png 扩展名是.png但实际是JPEG编码（FFD8FF头），尺寸1152×1536，与其他4张1086×1448 PNG不同

**交付产物**: validation/l01-asset-inventory.json（完整110+文件哈希清单）

# T01 源身份全量审核

审核时间: 2026-10-26
审核范围: active/references/originals/ 全部 PNG
方法: Pillow 读尺寸 + hashlib SHA256 读字节

## 素材清单

| 文件 | 尺寸 | SHA256 | 用途 |
|---|---|---|---|
| main-reading-v2.png | 1152x1536 | cc43f133c865b272f06cdff0d35086fae5b668100a70df09cc5cc1d0301eb411 | 当前主图 |
| side-reference.png | 1086x1448 | a516ad4653775d3295434602371861f7ed1ea822454dedd810cf1dabd0d620d3 | 右侧参考 |
| back-reference.png | 1086x1448 | 8bd1d23c05f72f3a48d3585184a635242d5c5a7cbe5070d2b7d9e0f61ce50574 | 背面参考 |
| main-front-three-quarter.png | 1086x1448 | 90fcbedfaba49fac7028597393fb4532c3d649e2f150cf45db6f6b9dc624b7e1 | 旧主图（已弃用） |
| front-variant.png | 1086x1448 | 5c767d2a58335d2aef978f6ad35a7e556f6da3c96d1de2312cf863dd4f4967bc | 正面变体（未用） |

## 发现

1. main-reading-v2.png 尺寸 1152x1536 与其他 4 张 1086x1448 不一致，不能混用同一坐标空间
2. main-front-three-quarter.png 是旧主图，SHA256 与 main-reading-v2 不同，不能当同一张图用
3. front-variant.png 未在任何 references 配置里引用，用途待 Codex 确认
4. side/back 两张尺寸一致（1086x1448），但视角不同，坐标不直接对应

## 点位偏差记录

见 shoulder-landmark-candidates.md v2（已画红点验证修正 4 处偏点）。
所有坐标是视觉估计，±15-30 像素误差，不是测量值。

## 不做

- 不自行确立跨姿态对应（Codex 把关）
- 不导入正式数据
- 不猜遮挡点

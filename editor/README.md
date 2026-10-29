# 轻漾 2.5D 角色编辑器

可视化 2.5D 角色编辑器（GitHub issue #4 / P0）：复用 `character-prototype` 已验收的网格、蒙版、接触权重与物理，
提供可实际编辑的图层/网格/蒙版/参数工作台，并能把编辑结果导出为现有 Android 资产管线兼容的二进制格式。
**编辑器是推进动态壁纸主线的工具，不是独立产品。**

## 启动（一条命令）

```bash
node editor/server.mjs          # 默认 http://127.0.0.1:8644/
node editor/server.mjs 9000     # 自定端口
```

浏览器打开 `http://127.0.0.1:8644/`。零 npm 依赖；Node ≥ 18（本机可用
`C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe`）。

## 功能（A 阶段闭环）

| 区块 | 能力 |
|------|------|
| 素材 | 导入 PNG/JPG/WebP（可勾选"作为蒙版导入"）；启动时自动导入 character-prototype 三件套 |
| 图层 | 三层结构（背景补绘 / 人物 / 前景图纸），显示开关，选择 |
| 画布 | WebGL 实时渲染（形变与样片同公式）；叠加层显示网格/控制点/接触区；点可选可拖，拖后实时形变 |
| 蒙版 | 多边形工具（点击加点、双击闭合，目标可选"蒙版多边形"或"接触固定区"）、画笔/擦除（可调半径） |
| 属性 | 弹簧（频率/阻尼/限幅）、位移上限（躯干/胸部/头发）、激发增益、7 个语义区域场（head/neck/chest/shoulder/torso/cheek/hair）、接触区羽化 |
| 预览 | 播放 18 秒演示轨迹 / 暂停 / 单步 / 复位；手动指针输入；编辑强度滑杆 |
| 历史 | 撤销/重做（Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y），上限 100 步 |
| 工程 | 保存/打开 `.qingyang.json`（格式 `qingyang-editor-project` v1，schema 校验后才加载） |
| 导出 | `editor/export/export-android-assets.mjs` 生成 Android assets 兼容 bins + report，`--check` 逐字节比对 |

## 工程文件格式

`qingyang-editor-project` v1（JSON）：画布、图层（纹理引用/蒙版/网格模式/接触区 pins/坐姿支撑/
顶点编辑 vertexEdits/区域场/弹簧参数）。加载前过 `validateProject`，坏数据拒绝导入。
纹理以文件名引用仓库内 `character-prototype/preview/` 资产（原图只读，哈希见 `references/asset-manifest.json`）。

## 测试

```bash
node editor/tests/run.mjs        # 25 项：project/geometry/contacts/physics/history/export
```

关键断言：
- **图层权重与原型 contactWeights 逐字节一致**（同源算法+同源数据）
- **未编辑工程导出的 `character_mesh.bin`/`character_pins.bin`/`foreground_mesh.bin` 与
  `android-app/app/src/main/assets/` 现有文件逐字节一致**（G5 核心）
- 带编辑工程 `--check` 被拒绝（反向用例）
- 30/60/120fps 同一连续轨迹峰值位移离散 < 10%（G3）
- 弹簧收敛、无 NaN、限幅、固定点行为（G3 预演）

## 与现有管线的兼容

导出器与 `android-app/tools/export_mesh.mjs` 复用同一套模块（`rig.mjs`/`contact-rig.mjs`，只读 import），
二进制布局一致：mesh = 三角形展开顶点对 Float32LE；pins = 每顶点 Float32LE。
修改源图/mesh 后的原管线命令不受影响：`export_mesh.mjs --check` 与 `scripts/verify_assets.py` 全部通过（见 evidence/）。

## 边界与已知限制（不冒充完成）

- **连续视角真实范围 ±0.35 视角**（≈±10° 等效）：范围内局部轮廓/遮挡连续；超出为同一曲面滑移，不生成新轮廓/遮挡。研究页 `editor/research/view-arc.html` 有完整标注与素材缺口清单（多角度序列/深度代理/中间角度/背面内容四条缺口）。
- **Android 参数接线未做**：导出的 bins（几何/权重）与现有资产管线逐字节兼容，但编辑器调出的区域场/弹簧参数尚无 Android 消费通道（Android Physics.java 为固定常量）——不写"已集成"。
- 文件选择器（打开工程/导入素材）在自动化浏览器（IAB）中不可驱动，已在真实浏览器路径实现但自动化验收标注 UNTESTED（数据回环由 Node 200 次测试覆盖）。
- 发梢 hairTip 通道是大视角演示增强：默认参数下与样片观感略有差异，需要完全一致时把 hairTip 增益调 0。
- 顶点编辑直接存储为槽位偏移；pin=1 的点拖拽时提示"接触固定区"，渲染权重不跟随（与导出语义一致）。
- 浏览器端 >30 分钟连续预览未跑；Node 侧 1000s 物理长跑已覆盖数值稳定性。

## 逐关验收

**G0–G8 逐项 PASS/FAIL/UNTESTED 与全部证据见 `editor/docs/ACCEPTANCE.md`**（任务书第七节格式）。


# 轻漾 2.5D 编辑器 · 验收报告（GitHub issue #4，任务书第七节格式）

生成时间：2026-10-30 00:00 前后（本地时间）。所有"实测"均为本机真实运行证据，未跑过的一律标 UNTESTED。

```yaml
基线分支/commit:   main @ 9c73bfe（"Clarify continuous viewing-angle goal and cloud access fallback"）
本次分支/commit:   feature/zcode-2p5d-editor，本地三个提交：
                   a4c2e04 (A 闭环) → 0baab10 (B 运动结构) → d9e5d9f (C 视角/安全框/研究页)
                   （工作区另有 D 阶段稳定性测试与验收文档提交）
可运行入口:        node editor/server.mjs  →  http://127.0.0.1:8644/
                   研究页: http://127.0.0.1:8644/editor/research/view-arc.html
                   零 npm 依赖；本机 Node: C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe (v24.21.0)
运行环境:          Windows 10.0.22631 x64 / 200% DPI / Chrome 内核（ZCode 内置浏览器，1280x720 视口实测）
```

## 已完成并实测的功能（全部为真实运行证据）

| 能力 | 证据 |
|------|------|
| 编辑器启动：导入主图/mask/背景/mesh.json，16384 三角形、三图层 | evidence/g1-editor-first-screen-with-mesh.png、g1-editor-clean-character.png |
| 拖拽网格顶点实时形变 + 撤销/重做 | 真浏览器拖拽顶点 42530（pin=0.00 hover 显示），撤销栈 1→0 回退 |
| 蒙版编辑：多边形填充 / 画笔 / 擦除 / 接触固定区绘制 | 真浏览器：蒙版多边形 5 点填充、新增接触区 pin-mxcu（均入撤销栈） |
| 预览：演示轨迹播放/暂停/单步/复位、手动指针、编辑强度 | 演示播放 119fps、phase 文案与位移联动 |
| 四组独立弹簧（body/chest/hair/hairTip）+ 区域场 7+1 语义区域实时可调 | 属性面板编辑即生效（commit 提交即入撤销栈） |
| 输入轨迹录制/回放/30-60-120fps 对比 | 录制 27 采样点 → 回放 t=3.42s → 对比输出（30fps RMS 0.63px/10.1%、60fps 0.64px/10.2%，基准 120fps 峰值 6.26px），evidence/b9-track-replay-fps-compare.png |
| 连续视角滑杆 + 静态基线归零 | 滑杆 0.72 → 视角 0.719、位移 6 通道活跃（发梢顶限幅 14px），evidence/c11-c13-view-slider-framing.png |
| 手机画幅安全框（9:20/9:19.5/16:9/1:1）+ 三档对照数据 | 9:20 偏移 20%: 脸✓肩切躯干✓肘切腰✓→waist-fully-visible；50%/80% 全可见；JSON 导出 |
| 连续视角范围研究页（±0.35 视角连续，超出即滑移不冒充侧背） | evidence/c12-view-arc-research.png：视角弧响应表 face ±11.93px / torso ±12.82px（对称），4 条素材缺口 |
| 工程文件保存/打开（qingyang-editor-project v1，schema 校验） | examples/reading-v2.qingyang.json（真浏览器序列化落盘，含 1 个顶点编辑） |

## 验收 G0–G8 逐项结论

**G0 工程安全 — PASS**
- 四张原图 SHA-256 与 references/asset-manifest.json 一致：4/4 PASS（back 8bd1d23c…、front-variant 5c767d2a…、main-front-three-quarter 90fcbedf…、side a516ad46…）。
- 现有主工程未动：`node android-app/tools/export_mesh.mjs --check` → PASS；`python scripts/verify_assets.py` → 13 文件过、4 对 identicalCopy、baselineApkVerified=true。
- 独立分支 + 独立 editor/ 目录；基线 commit 已记录；签名材料从未被读取/复制/移动。

**G1 可运行 — PASS**：真实启动、加载现有主图与网格、人物真实渲染、点可选可拖、实时渲染可见；截图两张为证。

**G2 编辑闭环 — PASS**（一个子环节标注见下）
- 实测链条：选择图层→拖拽顶点形变→蒙版多边形填充→新增接触固定区（权重自动重算）→调阻尼→播放演示→序列化保存→loadProject 重开（Node 200 次回环测试逐字段一致）→导出 --check。
- **UNTESTED 子项**：通过浏览器文件选择器的"打开工程"对话框在自动化浏览器（IAB）中不可驱动（平台限制）；loadProject 路径已由 Node 测试 200 次回环覆盖，但"点击文件选择器→选中文件"的人工操作路径未自动化验证。

**G3 物理正确 — PASS**
- 30/60/120fps 同一连续轨迹峰值位移离散 <10%（测试断言通过；实测轨迹对比 30fps RMS 10.1%/60fps 10.2%，为含手抖噪声的录制轨迹，指标随轨迹记录导出）。
- 静止收敛（5s 残差 <0.05px）、1000 秒长跑无 NaN、限幅总和约束、固定点不漂移（pin=1 顶点渲染 active=0，contactRecheck 7 固定点 pin=1 / 4 自由点 pin≈0）。
- 快速与缓慢输入行为可区分（快速胸部位移 >2× 缓慢）。

**G4 素材完整 — PASS（带目检说明）**
- 修改仅落 editor/ 派生资产；四张原图哈希不变（G0）。
- 网格质量检查器（checkMeshQuality）对默认工程无退化/翻转；极端偏移测试中能正确报出翻转（反向用例）。
- 截图目检无边缘黑线/接缝抖动/错误遮挡；**未做像素级前后 diff**，如需更严证据需额外基准图比对（未做，不冒称）。

**G5 导出兼容 — PASS（最强证据）**
- 编辑器"未编辑"工程导出的 character_mesh.bin / character_pins.bin / foreground_mesh.bin 与 android-app/app/src/main/assets/ **逐字节一致**（--check PASS）。
- 带编辑工程 --check 正确拒绝（反向用例）；editor-export-report.json 含 sha256 与 contactRecheckPassed=true。
- 既有三件套（export_mesh --check / verify_assets.py / validate-contacts.mjs allPassed）全过。
- **参数接线已完成**（commit 6a21ea1）：导出器生成 qingyang-render-params v1；Android 端 RenderParams.java 从 assets 读取，缺文件/解析失败回落默认（壁纸不黑屏）；SceneRenderer 区域场 uniform 化 + hairTip 通道；assets 默认参数=真机当前值（接线不改变现有行为）。**真机替换参数后的效果属 UNTESTED（G7 范围）**。

**G6 手机构图 — PASS**：4 档画幅、窗口偏移可调、锚点着色、三档对照 JSON；腰在 9:20 三档偏移下均不完全切掉（数据见 evidence 与上文表）。

**G7 真机边界 — UNTESTED（按定义）**：未连接 iQOO Z9 Turbo，不声称 Android 壁纸安装/锁屏渲染/耗电任何一项；本单承诺仅为编辑器成果。

**G8 稳定性 — PASS**
- 自动化：41/41 node:test 全过（新增 stability：1000s 物理长跑、200 次保存/重开循环、极限弹簧参数、±10000px 顶点偏移、坏工程数据拒绝）。
- 关键按钮逐一真浏览器操作：打开/保存/撤销/重做/导入素材对话框（文件选择本身 UNTESTED）/多边形/画笔/擦除/录制/回放/对比/滑杆/安全框/对照输出/播放/单步/复位/工具切换——均有状态栏回执或截图。
- 输入错误可控：坏 JSON/错版本/空图层/非法区域/非法接触区全部拒绝并提示；NaN/Infinity/越界输入钳制后物理全程有限。
- **UNTESTED 子项**：浏览器端 >30 分钟连续预览（内存/帧率漂移）未跑；Node 侧长跑已覆盖物理数值稳定性。

## 导出格式与 Android 兼容程度

- 导出器 `editor/export/export-android-assets.mjs`：工程 JSON → bins（Float32LE、三角形展开顶点+每顶点 pin，与 export_mesh.mjs 同格式同算法源）+ 三张纹理副本 + report（sha256/contactRecheck）。
- 兼容度：**几何与权重 100% 字节兼容**（未编辑工程逐字节一致）；**形变参数（区域场/弹簧/激发增益）Android 端尚无消费通道**，标注为未接线而非已集成。

## 可重现测试命令及结果

```bash
node editor/tests/run.mjs        # 41/41 PASS（约 0.6s）
node editor/scripts/make-pristine-project.mjs && \
node editor/export/export-android-assets.mjs editor/tmp/reading-v2-pristine.qingyang.json \
     android-app/app/src/main/assets --check   # PASS 逐字节一致
node android-app/tools/export_mesh.mjs --check  # PASS（基线未破坏）
python scripts/verify_assets.py                 # 13 文件 PASS
node character-prototype/preview/validate-contacts.mjs  # allPassed=true
```

## 当前无法达成的角度/遮挡/物理效果（诚实清单）

1. **连续视角真实范围 ±0.35 视角（≈±10° 等效）**：范围内局部轮廓/遮挡连续；超出为同一曲面滑移，不生成新轮廓/遮挡（不冒充全角度）。
2. **侧背真实生成未实现**：四张参考图姿态不一致（非同瞬间多机位）、无深度/几何代理、无中间角度实拍、背面内容与主图不对应——详见研究页四条缺口。
3. **编辑器参数在真机上的实际效果未验**：参数链路（导出→assets→RenderParams→渲染）已通且编译通过，但替换参数后 iQOO 上的观感/手感需真机确认。
4. **发梢 hairTip 通道为大视角演示增强**：默认参数下与样片观感略有差异（发梢惯性更大），如需与样片完全一致可将 hairTip 增益调 0。

## 具体文件路径与运行说明

见 `editor/README.md`（启动/功能表/格式/测试/边界）。

## 下一步仅限真正阻塞完成度的问题

1. **git push 渠道**：三个+ commit 在本地分支安全保存，直连 push 两次失败（connection reset/timeout）；需可用渠道或由有凭据环境代推 `feature/zcode-2p5d-editor`。
2. （非阻塞）Android 端消费编辑器形变参数的接线，属下一阶段工作。

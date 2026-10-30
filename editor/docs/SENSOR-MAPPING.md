# 轻漾 · 传感器与取景映射（T10 文档化）

> 轴向约定曾踩坑（roll/pitch 接反过一次），本文把当前实现固化，改动前先对照。

## 1. 传感器 → 目标视角（Physics.updateTarget）

| 物理量 | 字段 | 映射 | 语义 |
|---|---|---|---|
| 重力倾斜（roll，绕屏幕纵轴） | `motion.tiltX` / `TILT_FULL=0.30` | `targetX = clamp(tiltX/0.30, -1, 1)` | 顶部向左倾 → 内容向右移（viewX>0，"屏幕即窗口"约定） |
| 重力倾斜（pitch，绕屏幕横轴） | `motion.tiltZ` / TILT_FULL | `targetY = clamp(tiltZ/0.30, -1, 1)` | 顶部后仰 → 内容向下移 |

- 重力**基线在进入壁纸时取**：怎么拿着都算中性；中途改变设备姿态会停留在"与基线的差"上（设计行为，不是 bug）。
- 视角跟手采用 `1-exp(-dt*12)` 平滑；保持倾斜就停在对应视角。

## 2. 角速度 → 弹簧激发（快晃回弹）

- 视角速度差分得角加速度 `ax/ay`，**限幅 ±180**；
- **陀螺仪激励**（真机快晃时倾斜角几乎不变，靠这一路给回弹）：
  - roll（`motion.alphaY*0.05`，限 6）→ 横向回弹（bodyX/chestX/hairX 各叠加 `gx*9/18/11`）
  - pitch（`motion.alphaX*0.05`，限 6）→ 纵向回弹（bodyY/chestY + `gy*9/18`）
- **轴向对应（改过一次，别再反）**：绕屏幕纵轴左右倾 = roll → `wy` → 横向；绕屏幕横轴前后倾 = pitch → `wx` → 纵向。

## 3. 跟移取景（T02 选项 A，RenderParams.viewPan）

- `pan01 = clamp(viewPanBase + viewX * viewPanRange, 0, 1)`
- 默认 `base=0.5, range=0`：居中且不跟移（与参数接线前行为一致）
- 研究值（编辑器导出）：`base=0.56`（主图 main-front-three-quarter 人物质心）、`range=0.08`
- SceneRenderer：`updateNdc()` 把横向裁切余量按 pan01 分配；纵向裁切/铺满时自动回退居中，永不越界。
- **四视角固定窗口不可行、跟移可行**的证据：`editor/evidence/view-study/multiview-framing-panel.png`、
  `follow-window-mode.png`；算法 `editor/src/framing.mjs`（multiViewFraming/followWindowPath）。

## 4. 验证手段（可复用）

- 模拟器：`adb emu sensor set acceleration x:y:z`（重力注入）、`adb emu sensor set gyroscope x:y:z`（角速度）；
  日志 tag `QingyangPreview`/`QingyangRender`（fps + view + body/chest/hair/tip/pan + tilt/alpha/lin）。
- **轴向坑**：注入 `gyroscope 0:0:v` 对弹簧无效——Z 轴（偏航）不映射到任何回弹通道，改 roll/pitch。

# 轻漾 · debug 候选包（含跟移取景，未签名发布）

**文件**：`轻漾-2.5D-候选包-含跟移取景-debug.apk`
**SHA256**：`b02e2fe0a8a3055a6aed8ab1195bd8c5072e6d12f3edfaffc6e3ae2e5be660ea`
**大小**：6,411,360 字节
**构建**：feature/zcode-2p5d-editor @ 51f35a3+（debug 签名，**仅供测试，非正式发布包**）

## 包含内容（相对 main 分支）

1. **参数接线**：`assets/qingyang-params.json`（qingyang-render-params v1）驱动渲染/物理——
   区域场、四组弹簧、激发增益、位移上限、viewPan 跟移取景全部参数化，缺文件/坏数据回落内置默认。
2. **跟移取景（T02 选项 A）**：取景窗口随视角小幅平移。**当前默认 base=0.5/range=0（关闭）**；
   要体验请把 `editor/export/export-android-assets.mjs` 导出的 params.json（viewPan base=0.56/range=0.08）
   放进 assets 重新构建，或手改 assets 后重打包。
3. **hairTip 发梢通道**（第四弹簧）与区域场 uniform 化。
4. **EGL 首建修复**：修复 main 分支壁纸引擎首次不建 EGL surface 的桌面黑屏 bug。

## 安装

- 模拟器/测试机直装（debug 签名）。**与已安装的 0.5.x 正式包签名不同，需先卸载旧版**。
- iQOO Z9 Turbo（Android 16）未测——真机手感/帧率/耗电待 T17/T18。

## 已验证边界（模拟器 preview_34）

- 预览与桌面壁纸渲染正常（16384 三角形、34fps 软件渲染）
- range=0.08 时 pan 随倾斜实时摆动（0.56→0.48→0.52）并收敛；range=0 时恒 0.5
- 熄屏停止渲染、亮屏恢复（生命周期门控）

## 未验证

- 真机观感/帧率/耗电/温升/锁屏（T17–T19，需 iQOO）
- 正式签名包（签名材料不在仓库，T16 需原证书）

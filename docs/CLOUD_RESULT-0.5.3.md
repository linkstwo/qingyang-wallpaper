# 节点一：锁屏裁剪与运动整理（0.5.3 / 12）

基于 GitHub feature/cloud-framing-response 的 95a8cf1，保留 EGL 修复、四张原图、网格和接触点。

## 用户反馈与修正

用户反馈锁屏仍裁剪背部，晃动稍显怪。尚无手机 Surface 日志，不能把某一种 OEM 行为当成已确定根因。

- 构图原来按整张 Surface 定义；现在用物理显示尺寸与系统 onOffsetsChanged 的像素/归一化偏移确定可见矩形，在该窗口内构图。处理双屏宽 Surface、左右滚动和比屏幕小的系统预览。
- 默认人物大小以完整 1086px 原图宽度的 90% 为基准，并将主体中心设在 source x=590，给右侧背部留余量。1260×2800 下，背部 x=1010 在模拟 25% 居中放大后仍位于屏内。这是模拟，不是 iQOO 锁屏实测。
- 新增 65%～125% 人物大小滑杆，自动启用舒展构图，立即持久化到壁纸。OEM 仍裁剪时可以继续缩小，不需要重新改源码。
- onZoomChanged 只记录系统的归一化提示；它并非实际放大倍数，因此没有把它错误地当成比例反向补偿。没有使用隐藏 API。
- 取消对显示视角二次求导驱动局部弹簧，改成平滑的角加速度、线性加速度与轻微视角速度激励。身体、局部软组织、发梢有不同频率和阻尼。线性加速度首次实际接入物理。
- 人物旧轮廓的背景填补保持开启，去掉随运动强弱切换造成的明暗/重影变化。限制缩小构图时的惯性补偿，避免人物虽小却像橡皮片被过度拖动。

## 验证

- 实际 Android SDK34 release 构建成功（unsigned；需原发布密钥签名后覆盖安装）。
- 52 项既有真实 RenderLoop/EglCore 主机生命周期检查通过。
- Java/JS 相同输入数值对照、30/60/120fps 固定步长、停更清力、恒定倾斜、线性平移方向与停止收敛通过。
- 纯转动合成输入下，局部峰值 1.8531 source px，发梢 X 3.1968 / Y 0.7070px；本轮重在平滑与自然，不能用峰值等同于用户手感。
- 桌面 Mesa EGL 实际绘制生产 GLSL；仅发梢运动时所选脸和手部接触 ROI 变化为 0。原图、接触网格与共享 shader 导出校验通过。

## 真机待验

确认安装版本 0.5.3/12；切到舒展肩背，人物大小先90%，系统额外放大仍裁剪则向左调。看预览/锁屏背部、缓慢倾斜、快速反向、停止后收敛及重复唤醒。若仍异常，保留 QingyangWallpaper 的 window offset / system zoom hint 与 QingyangRender 的 FIRST_SWAP_OK surface/visible 日志。

Android API 依据：https://developer.android.com/reference/android/service/wallpaper/WallpaperService.Engine

## 保存状态

节点一源码将提交到现有 feature/cloud-framing-response 分支。0.5.2 文档中的403是当时状态；当前授权已修复，不代表本轮推送失败。
